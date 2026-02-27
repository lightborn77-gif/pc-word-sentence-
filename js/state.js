// state.js - 전역 상태 중앙 관리 모듈
// app.js의 전역 변수들을 여기로 모음
(() => {
  'use strict';
  
  const W = window;
  const App = W.App = W.App || {};

  // ---- 중앙 상태 저장소 ----
  App.State = {
    // 단어 데이터
    vocabulary: [],
    currentFileName: '',
    
    // 회화 데이터
    dialogData: [],
    dialogFileName: '',
    
    // 캐시
    cache: {
      quizPool: null,
      srsItems: null,
      settingsHash: ''
    },
    
    // 런타임 상태 (기존 engine.js와 통합)
    runtime: {
      mode: null,          // 'quiz', 'srs', 'dialog', 'shadow'
      isRunning: false,
      currentIndex: 0,
      lastAction: null
    },

    // ---- 레거시(PC 기존) 추가 상태 ----
    currentPool: [],
    timer: null,
    gaugeTimer: null,
    currentStep: 0,
    listPage: 0,
    listAutoTimer: null,
    quizHistory: [],

    // 학습 기록/통계(레거시)
    studyLog: (function(){
      try { return Storage.getJSON('studyLog', {}); } catch(e){ return {}; }
    })(),
    totalQuizHistory: (function(){
      try { return Storage.getJSON('totalQuiz', []); } catch(e){ return []; }
    })(),

    // 레거시 캐시/해시
    currentSettingsHash: '',

    // ---- Vocabulary 관리 ----
    getVocab() {
      return this.vocabulary;
    },
    
    setVocab(data, fileName = '') {
      this.vocabulary = data;
      this.currentFileName = fileName;
      this.clearCache();
      
      // 이벤트 발행
      App.dispatch?.emit?.('VOCAB_CHANGED', { data, fileName });
    },
    
    getVocabByNum(num) {
      return this.vocabulary.find(v => v.num === num);
    },
    
    getVocabInRange(start, end) {
      return this.vocabulary.filter(v => v.num >= start && v.num <= end);
    },
    
    // ---- Dialog 관리 ----
    getDialog() {
      return this.dialogData;
    },
    
    setDialog(data, fileName = '') {
      this.dialogData = data;
      this.dialogFileName = fileName;
      
      // 이벤트 발행
      App.dispatch?.emit?.('DIALOG_CHANGED', { data, fileName });
    },
    
    // ---- Cache 관리 ----
    clearCache() {
      this.cache.quizPool = null;
      this.cache.srsItems = null;
      this.cache.settingsHash = '';
    },
    
    getCache(key) {
      return this.cache[key];
    },
    
    setCache(key, value) {
      this.cache[key] = value;
    },
    
    // ---- Runtime 상태 관리 ----
    setMode(mode) {
      this.runtime.mode = mode;
      App.dispatch?.emit?.('MODE_CHANGED', { mode });
    },
    
    setRunning(isRunning) {
      this.runtime.isRunning = isRunning;
      App.dispatch?.emit?.('RUNNING_CHANGED', { isRunning });
    },
    
    setIndex(index) {
      this.runtime.currentIndex = index;
    },
    
    getRuntime() {
      return this.runtime;
    },
    
    // ---- 통계 계산 ----
    getStats() {
      const vocab = this.vocabulary;
      if (!vocab.length) {
        return {
          total: 0,
          memorized: 0,
          safe: 0,
          hard: 0,
          untested: 0,
          memRate: '0%'
        };
      }
      
      const total = vocab.length;
      const memorized = vocab.filter(v => v.m).length;
      const safe = vocab.filter(v => v.isSafe).length;
      const hard = vocab.filter(v => v.w >= 3 && !v.isSafe).length;
      const untested = vocab.filter(v => v.quizCount === 0).length;
      
      return {
        total,
        memorized,
        safe,
        hard,
        untested,
        memRate: total > 0 ? Math.round(safe / total * 100) + '%' : '0%'
      };
    }
  };
  
  // ---- 레거시 전역 변수 호환 레이어 ----
  // app.js가 아직 전역 변수를 사용하는 경우를 위한 브릿지
  function def(name, getter, setter){
    Object.defineProperty(W, name, {
      get: getter,
      set: setter || function(){},
      configurable: true
    });
  }

  def('vocabulary', () => App.State.vocabulary, (v) => { App.State.vocabulary = v; });
  def('currentFileName', () => App.State.currentFileName, (v) => { App.State.currentFileName = v; });

  // 레거시 회화: dialogScript 사용(내부는 dialogData로 저장)
  def('dialogScript', () => App.State.dialogData, (v) => { App.State.dialogData = v; });
  def('dialogFileName', () => App.State.dialogFileName, (v) => { App.State.dialogFileName = v; });

  // 레거시 학습 런타임
  def('currentPool', () => App.State.currentPool, (v) => { App.State.currentPool = v; });
  def('currentIndex', () => App.State.runtime.currentIndex, (v) => { App.State.runtime.currentIndex = v; });
  def('isRunning', () => App.State.runtime.isRunning, (v) => { App.State.runtime.isRunning = v; });

  // 레거시 타이머/진행
  def('timer', () => App.State.timer, (v) => { App.State.timer = v; });
  def('gaugeTimer', () => App.State.gaugeTimer, (v) => { App.State.gaugeTimer = v; });
  def('currentStep', () => App.State.currentStep, (v) => { App.State.currentStep = v; });

  // 레거시 리스트
  def('listPage', () => App.State.listPage, (v) => { App.State.listPage = v; });
  def('listAutoTimer', () => App.State.listAutoTimer, (v) => { App.State.listAutoTimer = v; });

  // 레거시 퀴즈 기록
  def('quizHistory', () => App.State.quizHistory, (v) => { App.State.quizHistory = v; });
  def('studyLog', () => App.State.studyLog, (v) => { App.State.studyLog = v; });
  def('totalQuizHistory', () => App.State.totalQuizHistory, (v) => { App.State.totalQuizHistory = v; });

  // 레거시 캐시: app.js에서 cache = {} 재할당을 하므로 set 허용
  def('cache', () => App.State.cache, (v) => {
    if (v && typeof v === 'object') App.State.cache = v;
  });
  def('currentSettingsHash', () => App.State.currentSettingsHash, (v) => { App.State.currentSettingsHash = v; });

  // currentMode(레거시)
  def('currentMode', () => App.State.runtime.mode, (v) => { App.State.runtime.mode = v; });
  // ---- Helpers ----
  App.State.pushBounded = function(arr, item, maxLen=2000){
    try{
      if (!Array.isArray(arr)) return;
      arr.push(item);
      if (arr.length > maxLen) arr.splice(0, arr.length - maxLen);
    }catch(e){}
  };

})();
