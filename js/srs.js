// srs.js (B안 1차)
// - SRS(간격 반복) 핵심 로직을 app.js에서 분리
// - 기존 코드 호환을 위해 전역 함수(updateSRS, getSRSItems)를 그대로 제공합니다.

(function(){
  'use strict';

  window.App = window.App || {};
  window.App.SRS = window.App.SRS || {};

  function _updateSRSImpl(item, correct){
    const today = new Date().toISOString().slice(0, 10);
    item.lastSeen = today;
    const easeFactor = parseFloat(
      document.getElementById('easeMode').value === 'custom'
        ? document.getElementById('customEase').value
        : document.getElementById('easeMode').value
    ) || 2.5;
    const lapseRate = parseFloat(document.getElementById('lapseMode').value);

    item.quizCount = (item.quizCount || 0) + 1;

    if (correct) {
      item.interval = Math.max(1, Math.round((item.interval || 1) * easeFactor));
      item.m = true;
      item.correctStreak = (item.correctStreak || 0) + 1;
      item.totalCorrect = (item.totalCorrect || 0) + 1;

      if (item.correctStreak >= 5 && item.totalCorrect >= 10) {
        item.isSafe = true;
        item.w = 0;
      } else {
        item.w = Math.max(0, item.w - 1);
      }
    } else {
      if (lapseRate === 0.0) item.interval = 1;
      else item.interval = Math.max(1, Math.round(item.interval * lapseRate));

      item.w = (item.w || 0) + 1;
      item.correctStreak = 0;
      item.isSafe = false;

      const todayIso = new Date().toISOString().slice(0, 10);
      item.wrongDates = item.wrongDates || [];
      if (!item.wrongDates.includes(todayIso)) {
        item.wrongDates.push(todayIso);
      }
    }

    // app.js에 존재하는 기존 함수 호출(동작 유지)
    if (typeof saveLocal === 'function') saveLocal();
    if (typeof clearCache === 'function') clearCache();
  }

  function _getSRSItemsImpl(){
    const App = window.App || {};
    const State = App.State;
    
    // State 모듈 사용 또는 전역 변수 사용
    const vocabulary = State?.getVocab?.() || window.vocabulary || [];
    const cache = State?.cache || window.cache || {};
    const currentSettingsHash = cache.settingsHash || window.currentSettingsHash || '';
    
    const hash = getSettingsHash();
    if (cache.srsItems && currentSettingsHash === hash) return cache.srsItems;

    const today = new Date().toISOString().slice(0, 10);
    const s = parseInt(document.getElementById('startIdx').value) || 1;
    const e = parseInt(document.getElementById('endIdx').value) || 9999;
    const newOnly = document.getElementById('srsNewOnly').checked;
    const hardOnly = document.getElementById('srsHardOnly').checked;

    const result = vocabulary.filter(v => {
      if (v.num < s || v.num > e) return false;
      if (!v.lastSeen) return newOnly;

      const daysSince = Math.floor((new Date(today) - new Date(v.lastSeen)) / 86400000);
      let due = daysSince >= v.interval;

      if (hardOnly && v.w >= 3 && !v.isSafe) return true;
      if (v.w >= 1 && !v.isSafe) due = due || daysSince >= Math.max(1, Math.floor(v.interval / 2));
      if (!v.m) return true;

      return due;
    });

    // State 모듈 사용 또는 전역 변수 사용
    if (State?.setCache) {
      State.setCache('srsItems', result);
      State.cache.settingsHash = hash;
    } else {
      cache.srsItems = result;
      if (window.currentSettingsHash !== undefined) window.currentSettingsHash = hash;
    }
    
    return result;
  }

  // 기존 전역 함수명 유지
  window.updateSRS = _updateSRSImpl;
  window.getSRSItems = _getSRSItemsImpl;

  // App.SRS 네임스페이스 제공
  window.App.SRS.updateSRS = _updateSRSImpl;
  window.App.SRS.getSRSItems = _getSRSItemsImpl;

})();
