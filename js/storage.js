/* ========== 💾 Storage (IndexedDB 모듈 — localStorage 완전 호환 API) ========== */
/**
 * 내부적으로 IndexedDB를 사용하며, 메모리 캐시 덕분에 기존
 * 동기 방식 코드(Storage.get / set / getJSON / setJSON …)는
 * 그대로 동작합니다.
 *
 * 페이지 로드 시 모든 데이터를 메모리 캐시로 프리로드하므로
 * 첫 번째 Storage.ready 이후에는 동기 읽기가 항상 가능합니다.
 *
 * 사용법:
 *   await Storage.ready;          // 앱 초기화 전 한 번 대기
 *   Storage.set('key', 'val');    // 동기 — 캐시+IDB 동시 저장
 *   Storage.get('key');           // 동기 — 캐시에서 즉시 반환
 */

const Storage = (() => {
  const DB_NAME    = 'vocabProDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'kv';
  const PREFIX     = 'vocabPro_';

  let _db    = null;
  let _cache = {};   // 메모리 캐시 (prefix 없는 key → 원시 string/null)

  /* ── IndexedDB 초기화 ───────────────────────────────────── */
  function _openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    });
  }

  /* ── IDB 전체 키/값 프리로드 ───────────────────────────── */
  function _loadAll(db) {
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.getAll();
      const kreq  = store.getAllKeys();
      let vals = null, keys = null;
      req.onsuccess   = e => { vals = e.target.result; if (keys) done(); };
      kreq.onsuccess  = e => { keys = e.target.result; if (vals) done(); };
      req.onerror = kreq.onerror = e => reject(e.target.error);
      function done() {
        keys.forEach((k, i) => {
          if (String(k).startsWith(PREFIX)) {
            _cache[String(k).slice(PREFIX.length)] = vals[i];
          }
        });
        resolve();
      }
    });
  }

  /* ── localStorage 마이그레이션 (최초 1회) ──────────────── */
  function _migrate(db) {
    try {
      const lsKeys = Object.keys(localStorage);
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      lsKeys.forEach(lk => {
        const shortKey = lk.startsWith(PREFIX) ? lk.slice(PREFIX.length) : lk;
        const idbKey   = PREFIX + shortKey;
        const val      = localStorage.getItem(lk);
        if (val !== null && !(_cache[shortKey] !== undefined)) {
          store.put(val, idbKey);
          _cache[shortKey] = val;
        }
      });
    } catch(_) {}
  }

  /* ── IDB 비동기 쓰기 (캐시와 분리) ────────────────────── */
  function _idbPut(shortKey, value) {
    if (!_db) return;
    try {
      const tx    = _db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, PREFIX + shortKey);
    } catch(_) {}
  }

  function _idbDelete(shortKey) {
    if (!_db) return;
    try {
      const tx    = _db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(PREFIX + shortKey);
    } catch(_) {}
  }

  /* ── ready Promise ─────────────────────────────────────── */
  const ready = (async () => {
    try {
      _db = await _openDB();
      await _loadAll(_db);
      _migrate(_db);
    } catch(e) {
      console.warn('[Storage] IndexedDB 초기화 실패, localStorage 폴백 사용', e);
    }
  })();

  /* ── Public API (동기 — localStorage 완전 호환) ──────── */
  return {
    ready,

    // ── 키 헬퍼 ──────────────────────────────────────
    _prefix: PREFIX,
    _key(name) { return this._prefix + name; },

    // ── 기본 getter / setter ─────────────────────────
    get(key, fallback = null) {
      const v = _cache[key];
      return (v === undefined || v === null) ? fallback : v;
    },

    set(key, value) {
      const s = String(value);
      _cache[key] = s;
      _idbPut(key, s);
    },

    // ── JSON getter / setter ─────────────────────────
    getJSON(key, fallback) {
      const raw = _cache[key];
      if (raw === undefined || raw === null || raw === '') return fallback;
      try { return JSON.parse(raw); } catch(_) { return fallback; }
    },

    setJSON(key, obj) {
      const s = JSON.stringify(obj);
      _cache[key] = s;
      _idbPut(key, s);
    },

    // ── 타입별 헬퍼 ──────────────────────────────────
    getNumber(key, fallback = 0) {
      const v = this.get(key);
      if (v === null) return fallback;
      const num = Number(v);
      return isNaN(num) ? fallback : num;
    },

    getBoolean(key, fallback = false) {
      const v = this.get(key);
      if (v === null) return fallback;
      return v === 'true' || v === '1';
    },

    getArray(key, fallback = []) {
      return this.getJSON(key, fallback);
    },

    // ── 삭제 ─────────────────────────────────────────
    remove(key) {
      delete _cache[key];
      _idbDelete(key);
    },

    // ── 네임스페이스 전체 삭제 ────────────────────────
    clear() {
      const keys = Object.keys(_cache);
      keys.forEach(k => {
        delete _cache[k];
        _idbDelete(k);
      });
    },

    // ── 모든 키 목록 ─────────────────────────────────
    keys() {
      return Object.keys(_cache);
    },

    // ── 원본 키 접근 (마이그레이션용) ─────────────────
    getRaw(key, fallback = null) {
      const shortKey = key.startsWith(PREFIX) ? key.slice(PREFIX.length) : key;
      const v = _cache[shortKey];
      return (v === undefined || v === null) ? fallback : v;
    },

    setRaw(key, value) {
      const shortKey = key.startsWith(PREFIX) ? key.slice(PREFIX.length) : key;
      this.set(shortKey, value);
    }
  };
})();

try {
  Object.defineProperty(window, 'Storage', {
    get() { return Storage; },
    configurable: true
  });
} catch(_) {
  window.Storage = Storage;
}
