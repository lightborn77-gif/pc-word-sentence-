// engine_study.js - 학습 엔진 (깜박이 / 독해영작 / SRS 실행 루프)
// 의존: state.js, tts.js, ui_render_core.js, srs.js, app_pool.js, engine_dialog.js, engine_shadow.js

        let recursionDepth = 0;
        const MAX_RECURSION = 1000;

        /* ========== ▶️ 자동 진행 ========== */
        function startApp() {
            stopApp();
            
            const mode = getCurrentMode();
            clearCache(); 

            isRunning = true; 
            document.getElementById('startBtn').disabled = true; 
            document.getElementById('stopBtn').disabled = false;
            
            if (mode === 'dialogMode') {
                if (dialogScript.length === 0) { 
                    alert(I18N.bundle().err_load_dialog); 
                    stopApp(); 
                    return; 
                }
                if (currentIndex >= dialogScript.length) currentIndex = 0;
                runDialog();
                return;
            }

            if (mode === 'srsMode') {
                currentPool = getSRSItems();
            } else if (mode === 'quizMode') {
                currentPool = getQuizPool();
            } else {
                currentPool = [...getFiltered()];
            }
            
            if (currentPool.length === 0) { 
                alert(I18N.bundle().no_words_range); 
                stopApp(); 
                return; 
            }
            
            if (currentIndex >= currentPool.length) currentIndex = 0;
            currentStep = 0;
            
            // 🔍 독해/영작 모드 체크
            const readingMode = document.getElementById('readingMode') ? document.getElementById('readingMode').value : 'off';
            
            if (readingMode !== 'off') {
                // 독해/영작 모드 시작
                window.readingStep = 0;
                // 수동 답보기 버튼 표시
                document.getElementById('manualAnswerBtn').style.display = 'inline-block';
                runReading();
            } else if (mode === 'quizMode') {
                if (document.getElementById('shuffle').checked) currentPool.sort(() => 0.5 - Math.random());
                quizHistory = [];
                showQuiz();
            } else if (mode === 'srsMode') {
                runStudy();
            } else {
                runStudy();
            }
        }
        
        // 🔍 독해/영작 모드 실행 함수
        function runReading() {
            if (!isRunning || currentIndex >= currentPool.length) return stopApp();
            
            updateDisplay();
            
            const readingMode = document.getElementById('readingMode').value;
            const thinkTime = parseFloat(document.getElementById('thinkTime').value) * 1000; // 생각시간
            const answerTime = parseFloat(document.getElementById('answerTime').value) * 1000; // 답 표시시간 (설정값 사용)
            
            if (window.readingStep === 0) {
                // Step 0: 문제 표시 (생각시간)
                runBar(thinkTime);
                const _ts = typeof I18N !== 'undefined' ? I18N.bundle() : {};
        const msg = readingMode === 'eng-kor' ? (_ts.thinkInKorean || '영어를 보고 한글로 생각해보세요') : (_ts.thinkInEnglish || '한글을 보고 영어로 생각해보세요');
                document.getElementById('stMsg').innerText = msg;
                
                timer = setTimeout(() => {
                    window.readingStep = 1;
                    runReading();
                }, thinkTime);
            } else {
                // Step 1: 답 표시 (설정된 시간)
                runBar(answerTime);
                document.getElementById('stMsg').innerText = (typeof I18N !== 'undefined' ? I18N.bundle() : {}).checkAnswer || '답을 확인하세요';
                
                timer = setTimeout(() => {
                    window.readingStep = 0;
                    currentIndex++;
                    logStudy(1);
                    runReading();
                }, answerTime);
            }
        }
        
        // 👁️ 수동 답보기 함수
        function showManualAnswer() {
            if (!isRunning || window.readingStep === undefined) return;
            
            // 문제 표시 상태(step=0)일 때만 답을 보여줌
            if (window.readingStep === 0) {
                // 타이머 취소
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                // 답 표시로 전환
                window.readingStep = 1;
                updateDisplay();
                
                // 답 표시 상태로 타이머 재시작
                const answerTime = parseFloat(document.getElementById('answerTime').value) * 1000;
                runBar(answerTime);
                document.getElementById('stMsg').innerText = (typeof I18N !== 'undefined' ? I18N.bundle() : {}).checkAnswer || '답을 확인하세요';
                
                timer = setTimeout(() => {
                    window.readingStep = 0;
                    currentIndex++;
                    logStudy(1);
                    runReading();
                }, answerTime);
            }
        }

        // 기존 runStudy (깜빡이/SRS) 로직
        function runStudy() {
            if (!isRunning || currentIndex >= currentPool.length) return stopApp();
            recursionDepth = 0;
            updateDisplay();
            const spd = parseFloat(document.getElementById('wordSpeed').value) * 1000;
            recursionDepth++;
            if (recursionDepth >= MAX_RECURSION) {
                recursionDepth = 0;
                setTimeout(() => runStudy(), 0);
                return;
            }
            const item = currentPool[currentIndex];
            
            // 영단어와 한글을 동시에 표시
            document.getElementById('subDisplay').style.visibility = "visible";
            if (document.getElementById('autoSpeak').checked) speak(item.word);
            runBar(spd); 
            timer = setTimeout(() => { 
                if ((getCurrentMode() === 'srsMode')) {
                    updateSRS(vocabulary.find(v => v.num === item.num), true);
                }
                currentIndex++; 
                logStudy(1); 
                runStudy(); 
            }, spd);
        }

        function stopApp() {
            shadowStopFlag = true;
            if (shadowTimer) clearTimeout(shadowTimer);
            setShadowFinishBtnVisible(false);
            window.speechSynthesis.cancel();
            isRunning = false; 
            window.speechSynthesis.cancel(); // 🔧 음성 정지
            recursionDepth = 0; // 🔧 재귀 깊이 리셋
            window.currentReadingRole = null; // 🎨 읽기 상태 초기화
            window.readingStep = undefined; // 🔍 독해모드 상태 초기화
            // 수동 답보기 버튼 숨기기
            document.getElementById('manualAnswerBtn').style.display = 'none';
            if (timer) clearTimeout(timer); 
            if (gaugeTimer) clearInterval(gaugeTimer);
            timer = null; // 타이머 변수를 확실히 null로 초기화합니다.
            gaugeTimer = null;
            document.getElementById('timerMsg').innerText = ''; // 🎨 타이머 표시 초기화
            document.getElementById('startBtn').disabled = false;
            document.getElementById('stopBtn').disabled = true;
            document.getElementById('progressBar').style.width = "0%"; 
            updateDisplay();
        }

        function runBar(ms) {
            let s = Date.now(); 
            if (gaugeTimer) clearInterval(gaugeTimer); // 기존 게이지 타이머 정리
            gaugeTimer = setInterval(() => { 
                if (!isRunning) { // isRunning 플래그를 확인하여 정지 시 중단
                    clearInterval(gaugeTimer);
                    return;
                }
                document.getElementById('progressBar').style.width = Math.min(100, (Date.now() - s) / ms * 100) + "%"; 
            }, 30);
        }

// ========== 전역 노출 ==========
window.startApp = startApp;
window.stopApp = stopApp;
window.runBar = runBar;
window.showManualAnswer = showManualAnswer;
