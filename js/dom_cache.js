// dom_cache.js - cache DOM lookups by id (PC)
(() => {
  const cache = new Map();
  function byId(id){
    if (!id) return null;
    if (cache.has(id)) return cache.get(id);
    const el = document.getElementById(id);
    cache.set(id, el);
    return el;
  }
  function clear(){ cache.clear(); }
  window.DomCache = { byId, clear };
})();
