// data_io.js - 데이터 저장/불러오기 및 설정 관리
// 의존: state.js, storage.js, i18n.js

        function clearCache() {
            cache = {};
            currentSettingsHash = '';
            const customEaseInput = document.getElementById('customEaseInput');
            const easeMode = document.getElementById('easeMode');
            if (customEaseInput && easeMode) {
                customEaseInput.style.display = 
                    easeMode.value === 'custom' ? (getCurrentMode() === 'srsMode') ? 'inline' : 'none' : 'none';
            }
        }

        function getSettingsHash() {
            const settings = {
                start: document.getElementById('startIdx').value,
                end: document.getElementById('endIdx').value,
                unmem: document.getElementById('unmemOnly').checked,
                wrong: document.getElementById('wrongOnly').checked,
                safe: document.getElementById('starOnly').checked,
                mode: getCurrentMode(),
                dir: document.querySelector('input[name="quizDirection"]:checked')?.id,
                count: document.getElementById('quizCount')?.value,
                revive: document.getElementById('wrongRevive')?.checked,
                wrongDays: document.getElementById('wrongDays')?.value,
                shuffle: document.getElementById('shuffle')?.checked,
                srsNew: document.getElementById('srsNewOnly')?.checked,
                srsHard: document.getElementById('srsHardOnly')?.checked,
                ease: document.getElementById('easeMode')?.value,
                customEase: document.getElementById('customEase')?.value,
            };
            return JSON.stringify(settings);
        }

        function toggleDarkMode() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            Storage.set('darkMode', isDark ? 'enabled' : 'disabled');
            document.getElementById('themeBtn').textContent = isDark ? '☀️' : '🌙';
            saveLocal();
        }

        function saveLocal() {
            try {
                if (currentFileName) {
                    Storage.set('mem_' + currentFileName, JSON.stringify(vocabulary.map(v => ({ 
                            n: v.num, m: v.m, w: v.w, lastSeen: v.lastSeen, interval: v.interval, wrongDates: v.wrongDates,
                            quizCount: v.quizCount, correctStreak: v.correctStreak, totalCorrect: v.totalCorrect, isSafe: v.isSafe
                        }))));
}

                const colorToggles = {
                    learning: document.getElementById('toggleColorLearning') ? document.getElementById('toggleColorLearning').checked : false,
                    wrong: document.getElementById('toggleColorWrong') ? document.getElementById('toggleColorWrong').checked : false,
                    safe: document.getElementById('toggleColorSafe') ? document.getElementById('toggleColorSafe').checked : false,
                };
                Storage.setJSON('colorToggles', colorToggles);
                Storage.setJSON('studyLog', studyLog);
                Storage.setJSON('totalQuiz', totalQuizHistory);
                
                // 음성 선택 저장
                const voiceSelect = document.getElementById('voiceSelect');
                if (voiceSelect && voiceSelect.value) {
                    Storage.set('selectedVoice_' + currentStudyLang, voiceSelect.value);
                }
            } catch(err) {
                console.error('데이터 저장 실패:', err);
            }
        }

        function loadSettings() {
            try {
                // Storage.ready 완료 후 호출되므로 여기서 재로드 (state.js 초기화 시점엔 IndexedDB 미준비 가능)
                App.State.studyLog = Storage.getJSON('studyLog', {});
                App.State.totalQuizHistory = Storage.getJSON('totalQuiz', []);

                // UI 언어 복원
                I18N.init();
// 학습 언어 복원
                const savedStudyLang = Storage.get('studyLang');
                if (savedStudyLang) {
                    currentStudyLang = savedStudyLang;
                    document.getElementById('studyLangSelect').value = savedStudyLang;
                }
                
                const savedToggles = Storage.getJSON('colorToggles', {});
                if (document.getElementById('toggleColorLearning')) {
                    document.getElementById('toggleColorLearning').checked = savedToggles.learning !== undefined ? savedToggles.learning : false;
                }
                if (document.getElementById('toggleColorWrong')) {
                    document.getElementById('toggleColorWrong').checked = savedToggles.wrong !== undefined ? savedToggles.wrong : false;
                }
                if (document.getElementById('toggleColorSafe')) {
                    document.getElementById('toggleColorSafe').checked = savedToggles.safe !== undefined ? savedToggles.safe : false;
                }
                clearCache();
            } catch(err) {
                console.error('설정 로드 실패:', err);
            }
        }

        function exportData() { 
            try {
                const data = vocabulary.map(v => ({ 
                    n: v.num, m: v.m, w: v.w, lastSeen: v.lastSeen, interval: v.interval, wrongDates: v.wrongDates,
                    quizCount: v.quizCount, correctStreak: v.correctStreak, totalCorrect: v.totalCorrect, isSafe: v.isSafe
                }));
                
                const a = document.createElement('a'); 
                a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' })); 
                a.download = `save_${currentFileName || 'vocabulary'}.json`; 
                a.click();
                
                setTimeout(() => URL.revokeObjectURL(a.href), 100);
            } catch(err) {
                alert(((typeof I18N !== 'undefined' ? I18N.bundle() : {}).exportError || '데이터 내보내기 실패') + ': ' + err.message);
            }
        }
        
        function importData(input) { 
            if (!input.files[0]) return;
            
            const reader = new FileReader();
            
            reader.onerror = () => {
                alert((typeof I18N !== 'undefined' ? I18N.bundle() : {}).fileReadError || '파일 읽기 실패!');
            };
            
            reader.onload = e => { 
                try { 
                    const data = JSON.parse(e.target.result);
                    
                    if (!Array.isArray(data)) {
                        alert((typeof I18N !== 'undefined' ? I18N.bundle() : {}).invalidFile || '잘못된 파일 형식입니다.');
                        return;
                    }
                    
                    let importCount = 0;
                    data.forEach(d => { 
                        const it = vocabulary.find(v => v.num === d.n); 
                        if (it) { 
                            it.m = d.m; 
                            it.w = d.w;
                            if (d.lastSeen) it.lastSeen = d.lastSeen;
                            if (d.interval) it.interval = d.interval;
                            if (d.wrongDates) it.wrongDates = d.wrongDates; 
                            if (d.quizCount) it.quizCount = d.quizCount;
                            if (d.correctStreak) it.correctStreak = d.correctStreak;
                            if (d.totalCorrect) it.totalCorrect = d.totalCorrect;
                            if (d.isSafe !== undefined) it.isSafe = d.isSafe;
                            importCount++;
                        } 
                    });
                    
                    saveLocal();
                    clearCache();
                    updateDisplay();
                    { const _tb = typeof I18N !== 'undefined' ? I18N.bundle() : {}; alert((_tb.dataLoaded || '데이터 로드 완료') + ': ' + importCount + (_tb.items || '개 항목')); }
                    
                } catch(err) { 
                    { const _tb2 = typeof I18N !== 'undefined' ? I18N.bundle() : {}; alert((_tb2.invalidFile || '잘못된 파일 형식입니다') + ': ' + err.message); } 
                } 
            }; 
            
            reader.readAsText(input.files[0]); 
        }

        /* (legacy) 이전 영어 전용 음성 로더 - 현재 미사용 */
        function loadVoices() {
            // (legacy) 기존 영어 전용 로더 → 현재는 통합 TTS 로더 사용
            updateVoiceList();
        }

// ===== 전역 노출 =====
window.saveLocal = saveLocal;
window.loadSettings = loadSettings;
window.exportData = exportData;
window.importData = importData;
window.clearCache = clearCache;
window.getSettingsHash = getSettingsHash;
window.toggleDarkMode = toggleDarkMode;
