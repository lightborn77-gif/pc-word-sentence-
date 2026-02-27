// engine.js - B안(2차+3차) 기반: 전역 App/상태/타이머/디스패치 통일 포인트
(() => {
  const W = window;
  const App = W.App = W.App || {};

  // ---- State (필요한 것만 최소로, 기존 전역은 post_export에서 연결) ----
  

  // ---- Timers: 이름 기반 관리 (모드 전환/정지 시 한방 정리) ----
  const _timeouts = new Map();
  const _intervals = new Map();

  App.Timers = App.Timers || {
    setTimeout(name, fn, ms) {
      this.clearTimeout(name);
      const id = W.setTimeout(fn, ms);
      _timeouts.set(name, id);
      return id;
    },
    setInterval(name, fn, ms) {
      this.clearInterval(name);
      const id = W.setInterval(fn, ms);
      _intervals.set(name, id);
      return id;
    },
    clearTimeout(name) {
      const id = _timeouts.get(name);
      if (id) W.clearTimeout(id);
      _timeouts.delete(name);
    },
    clearInterval(name) {
      const id = _intervals.get(name);
      if (id) W.clearInterval(id);
      _intervals.delete(name);
    },
    clearAll() {
      for (const id of _timeouts.values()) W.clearTimeout(id);
      for (const id of _intervals.values()) W.clearInterval(id);
      _timeouts.clear();
      _intervals.clear();
    }
  };

  // ---- Dispatch: 이벤트 기반 액션 시스템 ----
  App.dispatch = (function() {
    const handlers = new Map();
    
    // 내장 핸들러 등록
    const builtInHandlers = {
      'STOP_ALL': () => {
        App.Timers.clearAll();
        if (App.TTS?.cancel) App.TTS.cancel();
        if (typeof W.stopApp === "function") W.stopApp();
      },
      'CLEAR_CACHE': () => {
        if (App.State?.clearCache) App.State.clearCache();
        if (typeof W.clearCache === "function") W.clearCache();
      },
      'TOGGLE_RUN': () => {
        if (typeof W.toggleRun === "function") W.toggleRun();
      }
    };
    
    // 내장 핸들러 등록
    Object.entries(builtInHandlers).forEach(([action, handler]) => {
      if (!handlers.has(action)) handlers.set(action, []);
      handlers.get(action).push(handler);
    });
    
    return {
      // 핸들러 등록
      register(action, handler) {
        if (!handlers.has(action)) handlers.set(action, []);
        handlers.get(action).push(handler);
      },
      
      // 핸들러 제거
      unregister(action, handler) {
        if (!handlers.has(action)) return;
        const list = handlers.get(action);
        const idx = list.indexOf(handler);
        if (idx > -1) list.splice(idx, 1);
      },
      
      // 이벤트 발행
      emit(action, payload) {
        if (App.State?.runtime) {
        App.State.runtime.lastAction = action;
        App.State.runtime.isRunning = (action !== 'STOP_ALL');
    }
        
        try {
          // 등록된 핸들러 실행
          const list = handlers.get(action) || [];
          list.forEach(fn => {
            try { fn(payload); } 
            catch (e) { console.error(`[${action}] handler error:`, e); }
          });
          
          // 레거시 호환: 전역 handleAction 함수 호출
          if (typeof W.handleAction === "function") {
            try { W.handleAction(action, payload); }
            catch (e) { console.error(`[${action}] legacy handler error:`, e); }
          }
        } catch (e) {
          console.error(`[dispatch] ${action} error:`, e);
        }
      }
    };
  })();
  
  // 레거시 호환: App.dispatch(action, payload) 형태로 직접 호출 가능
  // Proxy apply는 target이 함수일 때만 동작하므로, dispatch 자체를 함수로 교체
  const _dispatchObj = App.dispatch;
  const _dispatchFn = function(action, payload) {
    return _dispatchObj.emit(action, payload);
  };
  _dispatchFn.emit = _dispatchObj.emit.bind(_dispatchObj);
  _dispatchFn.register = _dispatchObj.register.bind(_dispatchObj);
  _dispatchFn.unregister = _dispatchObj.unregister.bind(_dispatchObj);
  App.dispatch = _dispatchFn;

})();

// ---- core/app.js + app.js 통합 (PHASE 8) ----
(function(){
  var existingApp = window.App || {};
  var existingInit = (existingApp && typeof existingApp.init === 'function') ? existingApp.init : null;

  window.App = existingApp;

  // App.init 래퍼 (engine.js에서 App.dispatch는 이미 정의됨)
  if (typeof window.App.init !== 'function') {
    window.App.init = function(){
      if (existingInit) {
        try { return existingInit.apply(this, arguments); } catch (e) {}
      }
      if (window.AppMain && typeof window.AppMain.init === 'function') {
        try { return window.AppMain.init.apply(this, arguments); } catch (e) {}
      }
    };
  }

  // AppMain.init 제공 (app.js에서 이동)
  window.AppMain = window.AppMain || {};
  if (typeof window.AppMain.init !== 'function') {
    window.AppMain.init = function(){
      try {
        if (window.AppBootstrap && typeof window.AppBootstrap.init === 'function') {
          window.AppBootstrap.init();
        } else if (window.Events && typeof window.Events.init === 'function') {
          // AppBootstrap이 없으면 Events.init() 직접 호출 (PHASE8 통합 이후 대비)
          window.Events.init();
        }
      } catch(e) {}
    };
  }
})();
