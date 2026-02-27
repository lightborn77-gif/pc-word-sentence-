// ui_render.js - 렌더/DOM 업데이트를 모듈로 묶는 시작점 (기존 함수는 post_export에서 연결)
(() => {
  const W = window;
  const App = W.App = W.App || {};
  App.UI = App.UI || {};

  // 기본 헬퍼 (기존 updateDisplay 등은 post_export에서 바인딩)
  App.UI.q = (sel, root=document) => root.querySelector(sel);
  App.UI.qa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  App.UI.safeText = (el, text) => { if (el) el.textContent = (text ?? ""); };
})();
