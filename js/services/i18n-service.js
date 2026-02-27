(function(){
  // Thin adapter for non-module environments.
  // Expose I18N with a stable toggle() API.
  if (!window.I18N) {
    window.I18N = {};
  }
  if (typeof window.I18N.toggle !== 'function') {
    // Fallback to legacy toggleLanguage() if present
    if (typeof window.toggleLanguage === 'function') {
      window.I18N.toggle = function(){ window.toggleLanguage(); };
    }
  }

  // Keep compatibility with existing inline onclick handlers in the UI
  // (e.g., onclick="__forceToggleUILang()")
  if (typeof window.__forceToggleUILang !== 'function') {
    window.__forceToggleUILang = function(){
      try {
        if (window.I18N && typeof window.I18N.toggle === 'function') {
          window.I18N.toggle();
        } else if (typeof window.toggleLanguage === 'function') {
          window.toggleLanguage();
        }

        // Force UI refresh if toggle() doesn't re-render
        if (typeof window.applyUILanguage === 'function') {
          window.applyUILanguage();
        }
        if (typeof window.updateUILanguage === 'function') {
          window.updateUILanguage();
        }
      } catch (e) {
        // ignore
      }
    };
  }
})();