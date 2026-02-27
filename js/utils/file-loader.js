(function(){
  // Thin adapter for non-module environments.
  // Provide FileLoader.load(...) alias expected by main.js
  if (!window.FileLoader) {
    window.FileLoader = {};
  }
  if (typeof window.FileLoader.load !== 'function' && typeof window.FileLoader.loadFile === 'function') {
    window.FileLoader.load = window.FileLoader.loadFile;
  }
})();