// app_pool.js - extracted from app.js (PC)
// NOTE: Shared DOM helper. Use var + window.$id to avoid 'already been declared' when multiple scripts load.
var $id = window.$id || ((window.DomCache && DomCache.byId) ? DomCache.byId : (id)=>document.getElementById(id));
window.$id = $id;

function getFiltered() {
            const hash = getSettingsHash();
            if (cache.filtered && currentSettingsHash === hash && cache._vocabLen === (vocabulary?.length||0)) return cache.filtered;

            const s = parseInt($id('startIdx').value) || 1;
            const e = parseInt($id('endIdx').value) || 9999;
            if (s > e) return [];
            
            const untested = $id('unmemOnly').checked;
            const star = $id('wrongOnly').checked;
            const safe = $id('starOnly').checked;

            const result = vocabulary.filter(v => v.num >= s && v.num <= e && (
                (!untested && !star && !safe) ||
                (untested && v.quizCount === 0) ||
                (star && v.w >= 1 && !v.isSafe) ||
                (safe && v.isSafe)
            ));
            
            currentSettingsHash = hash;
            cache._vocabLen = (vocabulary?.length||0);
            cache.filtered = result;
            return result;
        }