
// --- TTS guard helper ---
function __getTTS(){ return (window.TTS ? TTS : null); }

// [clearCache, getSettingsHash, toggleDarkMode, saveLocal, loadSettings] moved to js/data_io.js
        
        

        
        /* ========== 📁 파일 로드 및 파싱 ========== */
        


        


        


        



        
        
        // ===== 모듈화(1파일) : FileLoader =====
        // 파일 읽기/형식 감지/파싱(단어장·회화) 관련 진입점을 한 곳으로 묶습니다.
        



        /* ========== 🔍 데이터 필터링 ========== */
        
// [getFiltered] moved to separate module (see js/app_pool.js)


        // (B안 1차) Quiz 풀 생성 로직은 js/quiz.js로 분리
        // 기존 호출부는 그대로 두기 위해 wrapper만 유지합니다.
        function getQuizPool() {
            try {
                if (window.App?.Quiz?.getQuizPool) return window.App.Quiz.getQuizPool();
            } catch (e) {}
            // Fallback: global function (quiz.js가 old-style로 제공)
            try {
                if (window.getQuizPool && window.getQuizPool !== getQuizPool) return window.getQuizPool();
            } catch (e) {}
            return [];
        }

        
        /* ========== 🔄 SRS (간격 반복) 시스템 ========== */
        // (B안 1차) SRS 로직은 js/srs.js로 분리 (wrapper 유지)
        function updateSRS(item, correct) {
            try {
                if (window.App?.SRS?.updateSRS) return window.App.SRS.updateSRS(item, correct);
            } catch (e) {}
            try {
                if (window.updateSRS && window.updateSRS !== updateSRS) return window.updateSRS(item, correct);
            } catch (e) {}
        }

        function getSRSItems() {
            try {
                if (window.App?.SRS?.getSRSItems) return window.App.SRS.getSRSItems();
            } catch (e) {}
            try {
                if (window.getSRSItems && window.getSRSItems !== getSRSItems) return window.getSRSItems();
            } catch (e) {}
            return [];
        }

        
// [getCurrentMode, updateReadingMode] moved to js/ui_nav.js

        
        /* ========== 🎴 카드 표시 (메인 디스플레이) ========== */
        
// [updateDisplay] moved to separate module (see js/ui_render_core.js)


        
        /* ========== ▶️ 자동 진행 ========== */
// [startApp, runReading, showManualAnswer] moved to js/engine_study.js
        
// [runDialog, nextDialogLine] moved to js/engine_dialog.js


// [recursionDepth, MAX_RECURSION, runStudy, stopApp, runBar] moved to js/engine_study.js

        // 기존 showQuiz 로직
        
// [showQuiz] moved to separate module (see js/engine_quiz.js)


// [toggleMem] moved to js/ui_nav.js

// [exportData, importData, loadVoices] moved to js/data_io.js

// [updateStats, logStudy, renderReport] moved to js/ui_stats.js
        
        /* ========== 📋 모아보기 ========== */
        function openListView() { const list = getFiltered(); listPage = 0; renderList(list); document.getElementById('listModal').style.display = 'flex'; }
        function renderList(list) {
            document.getElementById('listTbody').innerHTML = list.slice(listPage * 5, listPage * 5 + 5).map(v => 
                `<tr onclick="speakVocabByNum(${v.num})"><td>${v.word}</td><td>${v.meaning}</td><td>🔊</td></tr>`
            ).join('');
            document.getElementById('listPageInfo').innerText = `${listPage + 1} / ${Math.ceil(list.length / 5) || 1}`;
        }
        function moveListPage(d) { const list = getFiltered(); listPage = Math.max(0, Math.min(Math.ceil(list.length / 5) - 1, listPage + d)); renderList(list); }
        function toggleListAuto() {
            if (listAutoTimer) { clearInterval(listAutoTimer); listAutoTimer = null; document.getElementById('listPlayBtn').innerText = "재생"; }
            else { listAutoTimer = setInterval(() => moveListPage(1), parseFloat(document.getElementById('listSpeed').value) * 1000); document.getElementById('listPlayBtn').innerText = "정지"; }
        }
        function closeListView() { if (listAutoTimer) clearInterval(listAutoTimer); document.getElementById('listModal').style.display = 'none'; }
        
        
        // === TTS 대상 텍스트 선택 헬퍼 ===
        function hasHangul(s) { return /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3]/.test(s || ''); }
        function hasLatin(s) { return /[A-Za-z]/.test(s || ''); }
        function pickTextByStudyLang(a, b) {
            const t1 = (a ?? '').toString();
            const t2 = (b ?? '').toString();
            if (currentStudyLang === 'ko') {
                if (hasHangul(t1)) return t1;
                if (hasHangul(t2)) return t2;
                return t1 || t2;
            } else {
                if (hasLatin(t1)) return t1;
                if (hasLatin(t2)) return t2;
                return t1 || t2;
            }
        }
        function getVocabSpeakText(v) {
            if (!v) return '';
            if (currentStudyLang === 'ko') return (v.meaning ?? v.word ?? '').toString();
            return (v.word ?? v.meaning ?? '').toString();
        }
        function speakVocabByNum(num) {
            const v = vocabulary.find(x => x.num === num) || getFiltered().find(x => x.num === num);
            speak(getVocabSpeakText(v));
        }
        function speakReportByIndex(i) {
            const h = quizHistory[i];
            if (!h) return;
            speak(pickTextByStudyLang(h.a, h.q));
        }
		function speak(t) {
            return TTS.speak(t);
        }

        // 🗣️ 회화 모드용으로 manualSpeak 로직 수정
        function manualSpeak() { 
            const mode = getCurrentMode();
            
            if (mode === 'dialogMode' && dialogScript.length > 0 && dialogScript[currentIndex]) {
                speak(dialogScript[currentIndex].text);
            } else {
                const p = isRunning ? currentPool : (mode === 'srsMode' ? getSRSItems() : getFiltered()); 
                if (p.length > 0 && p[currentIndex]) speak(getVocabSpeakText(p[currentIndex])); }
        }
        
        // 🗣️ 회화 모드에서 다음으로 넘어가는 로직 수정 (Dialog Mode일 경우 nextDialogLine 호출)
        
// [nextCard, prevCard] moved to js/ui_nav.js

// [toggleSettings, modeToggle] moved to js/ui_nav.js

        // ⭐️ DOMContentLoaded로 모든 초기화 및 이벤트 리스너 통합 (안정성 확보)
        
        
        /* ========== 🧩 Modes (학습 모드 로직 묶음) ========== */
        // ✅ 한 파일 안에서 "모드별 진입점"을 한 곳에서 찾을 수 있게 정리한 매핑입니다.
        // - 기존 함수/동작은 그대로 두고, 참조만 모아둔 형태(안전한 모듈화)
        const Modes = {
            // 현재 모드/공용
            getCurrentMode,
            start: startApp,
            stop: stopApp,
            updateDisplay,

            // 단어/읽기/깜빡이 계열
            reading: { run: runReading, updateReadingMode },
            study: { run: runStudy },

            // 퀴즈
            quiz: { show: showQuiz, toggleMem, getQuizPool, getFiltered },

            // 회화(대화)
            dialog: { run: runDialog, next: nextDialogLine },

            // 쉐도잉(안정 버전)
            shadowing: { run: runShadowingStable, speak: speakShadowStable, finish: finishShadowing, setFinishButtonVisible: setShadowFinishBtnVisible },
        };

/* ========== 🚀 초기화 (DOMContentLoaded) ========== */
        document.addEventListener('DOMContentLoaded', () => {
            // 1. 다크 모드 및 설정 로드
            if (Storage.get('darkMode') === 'enabled') {
                document.body.classList.add('dark-mode');
                document.getElementById('themeBtn').textContent = '☀️';
            }
            loadSettings(); // 컬러 토글 설정 로드
            
            // 1-1. 설정 토글 상태 로드
            if (Storage.get('showBasicSettings') !== null) {
                document.getElementById('showBasicSettings').checked = Storage.get('showBasicSettings') === 'true';
            }
            if (Storage.get('showStudySettings') !== null) {
                document.getElementById('showStudySettings').checked = Storage.get('showStudySettings') === 'true';
            }
            if (Storage.get('showReadingSettings') !== null) {
                document.getElementById('showReadingSettings').checked = Storage.get('showReadingSettings') === 'true';
            }
            if (Storage.get('showQuizSettings') !== null) {
                document.getElementById('showQuizSettings').checked = Storage.get('showQuizSettings') === 'true';
            }
            if (Storage.get('showSrsSettings') !== null) {
                document.getElementById('showSrsSettings').checked = Storage.get('showSrsSettings') === 'true';
            }
            if (Storage.get('showDialogSettings') !== null) {
                document.getElementById('showDialogSettings').checked = Storage.get('showDialogSettings') === 'true';
            }
            toggleSettings(); // 설정 표시 초기화
            
            // 1-2. TTS 음성 목록 로드
            updateVoiceList(); // 다국어 지원 버전으로 변경
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = updateVoiceList;
            }

            // voice 변경 시 즉시 저장
            // 2. 이벤트 리스너(버튼/키/입력) 일괄 바인딩
            App.init();

            // ===== dispatch 핸들러 등록 (깜박이 스페이스/방향키 수정) =====
            App.dispatch.register('START', () => { if (!isRunning) startApp(); });
            App.dispatch.register('PREV', () => {
                stopApp();
                prevCard();
            });
            App.dispatch.register('NEXT', () => {
                stopApp();
                nextCard();
            });
            App.dispatch.register('TOGGLE_MEM', () => toggleMem());
            App.dispatch.register('ESCAPE', () => { if (isRunning) stopApp(); });
            // VOCAB_CHANGED: 파일 로드 후 단어 화면 자동 갱신
            App.dispatch.register('VOCAB_CHANGED', () => {
                currentIndex = 0;
                clearCache();
                updateDisplay();
                updateStats();
            });
            // toggleRun은 engine.js에서 window.toggleRun을 호출하므로 전역에 노출
            window.toggleRun = function() {
                if (isRunning) stopApp(); else startApp();
            };

            // 4. 초기 상태 업데이트
            modeToggle(); // 모드 토글로 초기 UI 상태 설정
            clearCache();
            updateDisplay();
            updateStats();
            updateUILanguage(); // UI 언어 적용
        });
    
// [shadowTimer, shadowStopFlag, shadowFinishFlag, setShadowFinishBtnVisible, finishShadowing, speakShadowStable, runShadowingStable] moved to js/engine_shadow.js


        // ========== ⛶ Fullscreen (PC) ==========
        function toggleFullscreen() {
            try {
                if (!document.fullscreenElement) {
                    (document.documentElement.requestFullscreen ? document.documentElement.requestFullscreen() :
                     document.body.requestFullscreen ? document.body.requestFullscreen() : null);
                } else {
                    document.exitFullscreen && document.exitFullscreen();
                }
            } catch (e) {
                console.debug('Fullscreen error:', e);
            }
        }

        function updateFullscreenButton() {
            const btn = document.getElementById('fullscreenBtn');
            if (!btn) return;
            const isFs = !!document.fullscreenElement;
            btn.textContent = isFs ? '🡼' : '⛶';
            // i18n title
            try {
                const isEn = (window.I18N && I18N.current === 'en');
                { const _tf = typeof I18N !== 'undefined' ? I18N.bundle() : {}; btn.title = isFs ? (_tf.fullscreenExit || (isEn ? 'Exit Fullscreen' : '전체화면 종료')) : (_tf.fullscreenEnter || (isEn ? 'Enter Fullscreen' : '전체화면')); }
            } catch (e) {}
        }

        // Bind fullscreen button safely (do not interfere with existing init logic)
        document.addEventListener('DOMContentLoaded', () => {
            const btn = document.getElementById('fullscreenBtn');
            if (btn && !btn.__fsBound) {
                btn.addEventListener('click', (e) => { e.preventDefault(); toggleFullscreen(); });
                btn.__fsBound = true;
            }
            document.addEventListener('fullscreenchange', updateFullscreenButton);
            updateFullscreenButton();
        });


        // ========== ▣ Study-stage Fullscreen (internal) ==========
        function setStageToolbarTitles(){
            const isEn = (window.I18N && I18N.current === 'en');
            const btn = document.getElementById('stageFsBtn');
            { const _tf2 = typeof I18N !== 'undefined' ? I18N.bundle() : {}; if(btn) btn.title = _tf2.studyFullscreen || (isEn ? 'Study Fullscreen' : '학습창 풀화면'); }

            const exitBtn = document.getElementById('stageExitBtn');
            { const _tf3 = typeof I18N !== 'undefined' ? I18N.bundle() : {}; if(exitBtn) exitBtn.title = _tf3.close || (isEn ? 'Exit' : '닫기'); }

            const fp = document.getElementById('stageFontPlus');
            if(fp) fp.title = isEn ? 'Font +' : '글씨 크게';

            const fm = document.getElementById('stageFontMinus');
            if(fm) fm.title = isEn ? 'Font -' : '글씨 작게';

            const sb = document.getElementById('stageSettingsBtn');
            if(sb) sb.title = isEn ? 'Options' : '옵션';
        }

        function updateStageFsButton(){
            const btn = document.getElementById('stageFsBtn');
            if(!btn) return;
            const on = document.body.classList.contains('stage-full');
            btn.textContent = on ? '▣' : '▣';
            // keep title synced
            setStageToolbarTitles();
        }

        function toggleStudyStageFullscreen(){
            const entering = !document.body.classList.contains('stage-full');
            document.body.classList.toggle('stage-full');
            if(entering){
                // default: hide settings; user can open with ⚙
                document.body.classList.remove('stage-show-settings');
                // scroll stage to top for clean start
                try{ document.getElementById('studyStage')?.scrollTo(0,0); }catch(e){}
            }
            updateStageFsButton();
        }

        function toggleStageSettings(){
            document.body.classList.toggle('stage-show-settings');
        }

        function bumpStageFont(delta){
            const inp = document.getElementById('fontSize');
            if(!inp) return;
            let v = parseInt(inp.value || '38', 10);
            if(isNaN(v)) v = 38;
            v = Math.max(10, Math.min(200, v + delta));
            inp.value = v;
            if(typeof updateDisplay === 'function') updateDisplay();
        }

        document.addEventListener('DOMContentLoaded', () => {
            const stageBtn = document.getElementById('stageFsBtn');
            if(stageBtn && !stageBtn.__bound){
                stageBtn.addEventListener('click', (e)=>{ e.preventDefault(); toggleStudyStageFullscreen(); });
                stageBtn.__bound = true;
            }
            document.getElementById('stageExitBtn')?.addEventListener('click', (e)=>{ e.preventDefault(); document.body.classList.remove('stage-full'); updateStageFsButton(); });
            document.getElementById('stageLangBtn')?.addEventListener('click', (e)=>{ e.preventDefault(); toggleLanguage(); });
            document.getElementById('stageSettingsBtn')?.addEventListener('click', (e)=>{ e.preventDefault(); toggleStageSettings(); });
            document.getElementById('stageFontPlus')?.addEventListener('click', (e)=>{ e.preventDefault(); bumpStageFont(+4); });
            document.getElementById('stageFontMinus')?.addEventListener('click', (e)=>{ e.preventDefault(); bumpStageFont(-4); });

            // ESC exits study-stage fullscreen (doesn't affect browser fullscreen)
            document.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ App.dispatch('ESCAPE'); } });

            setStageToolbarTitles();
            updateStageFsButton();
        });


        // ===== Improved universal center apply (works in all modes & fullscreen) =====

        document.addEventListener('DOMContentLoaded', ()=>{        });
