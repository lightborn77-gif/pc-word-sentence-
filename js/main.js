(function () {
  // 단일 초기화
  document.addEventListener('DOMContentLoaded', function () {
    // PHASE 7: 언어 버튼 바인딩 (post_export.js의 setTimeout 패치 제거에 따라 여기서 명시 호출)
    if (typeof window.__bindLangButtonsDOMReady === 'function') {
      window.__bindLangButtonsDOMReady();
    } else {
      // fallback: stageLangBtn 직접 바인딩 (langBtn은 HTML onclick으로 처리됨)
      var stageLangBtn = document.getElementById('stageLangBtn');
      if (stageLangBtn && !stageLangBtn.__langBound) {
        stageLangBtn.__langBound = true;
        stageLangBtn.addEventListener('click', function (e) {
          e.preventDefault();
          if (typeof window.__forceToggleUILang === 'function') window.__forceToggleUILang();
        });
      }
    }

    // 풀스크린 학습창 언어 토글(stageLangBtn) - DOM 교체에도 안전하게 위임 방식으로 처리
    document.addEventListener('click', function (e) {
      var target = e.target && (e.target.closest ? e.target.closest('#stageLangBtn') : null);
      if (!target) return;

      e.preventDefault();

      // 1) I18N.toggle() 호출
      if (window.I18N && typeof window.I18N.toggle === 'function') {
        window.I18N.toggle();
      } else if (typeof window.toggleLanguage === 'function') {
        window.toggleLanguage();
      }

      // 2) 강제로 UI 업데이트 (toggle이 DOM 업데이트를 안 하는 경우 대비)
      if (typeof window.applyUILanguage === 'function') {
        window.applyUILanguage();
      }
      if (typeof window.updateUILanguage === 'function') {
        window.updateUILanguage();
      }
    });

    // 파일 입력 바인딩 (한 번만) — PHASE 7: setTimeout 패치 제거 후 여기서 보장
    var fileInput = document.getElementById('fileInput');
    if (fileInput && !fileInput.__fileBound) {
      fileInput.__fileBound = true;
      fileInput.addEventListener('change', function (e) {
        try {
          if (window.FileLoader && typeof window.FileLoader.loadFile === 'function') {
            window.FileLoader.loadFile(e);
          } else if (window.FileLoader && typeof window.FileLoader.load === 'function') {
            window.FileLoader.load(e);
          }
        } catch (err) {}
      });
    }

    // 앱 초기화 — IndexedDB 프리로드 완료 후 실행
    var _doInit = function() {
      if (window.App && typeof window.App.init === 'function') {
        window.App.init();
      }
    };
    if (window.Storage && window.Storage.ready && typeof window.Storage.ready.then === 'function') {
      window.Storage.ready.then(_doInit).catch(_doInit);
    } else {
      _doInit();
    }
  });
})();