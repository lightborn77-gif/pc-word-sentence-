// ui_nav.js - 카드 네비게이션 및 모드 제어
// 의존: state.js, srs.js, app_pool.js, tts.js, ui_render_core.js

/* ========== 🎯 모드 관리 ========== */
function getCurrentMode() {
    if (document.getElementById('showDialogSettings') && document.getElementById('showDialogSettings').checked && dialogScript.length > 0) return 'dialogMode';
    if (document.getElementById('showSrsSettings') && document.getElementById('showSrsSettings').checked) return 'srsMode';
    if (document.getElementById('showQuizSettings') && document.getElementById('showQuizSettings').checked) return 'quizMode';
    if (document.getElementById('showStudySettings') && document.getElementById('showStudySettings').checked) return 'studyMode';
    return 'studyMode';
}

// 🔍 독해/영작 모드 UI 업데이트
function updateReadingMode() {
    const mode = document.getElementById('readingMode').value;
    const container = document.getElementById('thinkTimeContainer');
    
    if (mode === 'off') {
        container.style.display = 'none';
    } else {
        container.style.display = 'inline';
    }
}

/* ========== ⬅️➡️ 카드 네비게이션 ========== */
function nextCard() { 
    const mode = getCurrentMode();
    
    if (mode === 'dialogMode') {
        nextDialogLine();
        return;
    }
    
    const p = isRunning ? currentPool : (mode === 'srsMode' ? getSRSItems() : getFiltered()); 
    const originalItem = vocabulary.find(v => v.num === p[currentIndex].num); 

    if (p.length > 0) {
        if (isRunning && (getCurrentMode() === 'srsMode') && originalItem) {
            updateSRS(originalItem, true);
        }
        currentIndex = (currentIndex + 1) % p.length;
        if (isRunning) logStudy(1); 
    }
    updateDisplay(); 
}

function prevCard() { 
    const mode = getCurrentMode();
    if (mode === 'dialogMode') {
         if (currentIndex > 0) currentIndex--;
    } else {
         if (currentIndex > 0) currentIndex--;
    }
    updateDisplay(); 
}

/* ========== ⭐ 외움 표시 ========== */
function toggleMem() { 
    const mode = getCurrentMode();
    const p = isRunning ? currentPool : (mode === 'srsMode' ? getSRSItems() : getFiltered()); 
    if (p.length === 0) return;
    
    const currentItemInPool = p[currentIndex];
    const it = vocabulary.find(v => v.num === currentItemInPool.num);

    if (it) { 
        it.m = !it.m; 
        
        if (it.m && mode === 'studyMode') {
            it.isSafe = true;
            it.w = 0;
            it.correctStreak = 5;
            it.totalCorrect = 10;
        } else if (!it.m) {
            it.isSafe = false;
        }
        
        if (mode === 'srsMode') updateSRS(it, it.m);
        
        saveLocal(); 
        updateDisplay(); 
        clearCache(); // 단어의 상태(외움/별표)가 바뀌었으므로 캐시 초기화
    } 
}

/* ========== ⚙️ 설정 표시 토글 ========== */
function toggleSettings(changedEl) {
    // 다중 선택 허용: 각 설정 패널은 독립적으로 체크/언체크 가능

    const showBasic = document.getElementById('showBasicSettings').checked;
    const showStudy = document.getElementById('showStudySettings').checked;
    const showReading = document.getElementById('showReadingSettings').checked;
    const showQuiz = document.getElementById('showQuizSettings').checked;
    const showSrs = document.getElementById('showSrsSettings').checked;
    const showDialog = document.getElementById('showDialogSettings').checked;
    const showShadow = document.getElementById('showShadowSettings') ? document.getElementById('showShadowSettings').checked : false;
    
    // 각 설정 영역 표시/숨김
    document.getElementById('basicOpt').style.display = showBasic ? 'block' : 'none';
    document.getElementById('studyOpt').style.display = showStudy ? 'flex' : 'none';
    document.getElementById('readingOpt').style.display = showReading ? 'flex' : 'none';
    document.getElementById('quizOpt').style.display = showQuiz ? 'flex' : 'none';
    document.getElementById('srsOpt').style.display = showSrs ? 'flex' : 'none';
    document.getElementById('dialogOpt').style.display = showDialog ? 'flex' : 'none';
    if (document.getElementById('shadowOpt')) document.getElementById('shadowOpt').style.display = showShadow ? 'block' : 'none';
    
    // 설정 저장 (localStorage)
    Storage.set('showBasicSettings', showBasic);
    Storage.set('showStudySettings', showStudy);
    Storage.set('showReadingSettings', showReading);
    Storage.set('showQuizSettings', showQuiz);
    Storage.set('showSrsSettings', showSrs);
    Storage.set('showDialogSettings', showDialog);
}

// ⭐️ modeToggle 로직 (설정 표시는 toggleSettings가 관리)
function modeToggle() { 
    stopApp(); 
    
    const srs = (getCurrentMode() === 'srsMode');
    document.getElementById('customEaseInput').style.display = 
        document.getElementById('easeMode').value === 'custom' && srs ? 'inline' : 'none';

    clearCache(); // 모드가 바뀌면 캐시 초기화
    updateDisplay();
}

// 전역 노출
window.getCurrentMode = getCurrentMode;
window.updateReadingMode = updateReadingMode;
window.nextCard = nextCard;
window.prevCard = prevCard;
window.toggleMem = toggleMem;
window.toggleSettings = toggleSettings;
window.modeToggle = modeToggle;
