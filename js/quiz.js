// quiz.js (B안 1차)
// - 퀴즈 풀 생성 로직을 app.js에서 분리
// - 기존 코드 호환을 위해 전역 함수(getQuizPool)를 그대로 제공합니다.
//   (B안 2차에서 App.Quiz 모듈/dispatch 기반으로 더 깔끔하게 정리)

(function(){
  'use strict';

  // Guard: app.js가 아직 로드되기 전에도 안전하게 존재하도록
  window.App = window.App || {};
  window.App.Quiz = window.App.Quiz || {};

  /**
   * 퀴즈 풀 생성 (기존 동작 유지)
   * 의존: App.State 또는 전역 vocabulary, cache, currentSettingsHash, getSettingsHash, I18N
   */
  function _getQuizPoolImpl(){
    const App = window.App || {};
    const State = App.State;
    
    // State 모듈 사용 또는 전역 변수 사용
    const vocabulary = State?.getVocab?.() || window.vocabulary || [];
    const cache = State?.cache || window.cache || {};
    const currentSettingsHash = cache.settingsHash || window.currentSettingsHash || '';
    
    const hash = getSettingsHash();
    if (cache.quizPool && currentSettingsHash === hash) return cache.quizPool;

    const s = parseInt(document.getElementById('startIdx').value) || 1;
    const e = parseInt(document.getElementById('endIdx').value) || 9999;
    const untested = document.getElementById('unmemOnly').checked;
    const star = document.getElementById('wrongOnly').checked;
    const safe = document.getElementById('starOnly').checked;
    const revive = document.getElementById('wrongRevive').checked;
    const quizCount = parseInt(document.getElementById('quizCount').value) || 20;

    let pool = vocabulary.filter(v => v.num >= s && v.num <= e);

    let basePool = pool.filter(v =>
      ((!untested && !star && !safe) ||
       (untested && v.quizCount === 0) ||
       (star && v.w >= 1 && !v.isSafe) ||
       (safe && v.isSafe))
    );

    basePool.sort(() => 0.5 - Math.random());
    basePool = basePool.slice(0, quizCount);

    let revivePool = [];
    if (revive) {
      const maxDays = parseInt(document.getElementById('wrongDays').value) || 7;
      const today = new Date().getTime();
      const cutoffTime = today - (maxDays * 86400000);

      const baseNums = new Set(basePool.map(v => v.num));

      revivePool = pool.filter(v => {
        if (baseNums.has(v.num)) return false;
        return v.wrongDates && v.wrongDates.some(dateStr => {
          const wrongTime = new Date(dateStr).getTime();
          return wrongTime >= cutoffTime;
        });
      }).map(v => ({ ...v, isRevived: true }));

      revivePool.sort(() => 0.5 - Math.random());
    }

    const finalPool = [...basePool, ...revivePool];

    const msg = I18N.bundle().quiz_pool_msg
      .replace('{total}', finalPool.length)
      .replace('{base}', basePool.length)
      .replace('{revive}', revivePool.length);
    const stMsg = document.getElementById('stMsg');
    if (stMsg) stMsg.innerText = msg;

    // State 모듈 사용 또는 전역 변수 사용
    if (State?.setCache) {
      State.setCache('quizPool', finalPool);
      State.cache.settingsHash = hash;
    } else {
      cache.quizPool = finalPool;
      if (window.currentSettingsHash !== undefined) window.currentSettingsHash = hash;
    }
    
    return finalPool;
  }

  // 기존 전역 함수명 유지
  window.getQuizPool = _getQuizPoolImpl;

  // App.Quiz 네임스페이스도 제공
  window.App.Quiz.getQuizPool = _getQuizPoolImpl;

})();
