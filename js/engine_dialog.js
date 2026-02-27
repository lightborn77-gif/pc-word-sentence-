// engine_dialog.js - 회화 모드 실행 루프
// 의존: state.js, tts.js, ui_render_core.js

        function runDialog() {
            if (document.getElementById('shadowingMode') && document.getElementById('shadowingMode').checked) {
                runShadowingStable();
                return;
            }
            if (!isRunning || currentIndex >= dialogScript.length) return stopApp();
            
            const item = dialogScript[currentIndex];
            
            // 🎨 동시 표시 모드를 위한 현재 읽는 역할 설정
            const showBoth = document.getElementById('dialogShowBoth').checked;
            if (showBoth) {
                window.currentReadingRole = item.role;
            }
            
            updateDisplay();

            const roleA = document.getElementById('dialogRoleA').value;
            const isCompTurn = item.role === roleA;
            
            const compSpeed = parseFloat(document.getElementById('dialogCompSpeed').value) || 0;
            const userSpeed = parseFloat(document.getElementById('dialogUserSpeed').value) || 0;
            
            const waitTime = isCompTurn ? compSpeed : userSpeed;

            if (waitTime > 0) {
                if (isCompTurn && document.getElementById('autoSpeak').checked) {
                    speak(item.text);
                }
                
                // 🎨 타이머 카운트다운 표시
                let remainingTime = waitTime;
                document.getElementById('timerMsg').innerText = `⏱ ${remainingTime.toFixed(1)}초`;
                
                const timerInterval = setInterval(() => {
                    remainingTime -= 0.1;
                    if (remainingTime > 0) {
                        document.getElementById('timerMsg').innerText = `⏱ ${remainingTime.toFixed(1)}초`;
                    } else {
                        document.getElementById('timerMsg').innerText = '';
                        clearInterval(timerInterval);
                    }
                }, 100);
                
                runBar(waitTime * 1000);
                const _td = typeof I18N !== 'undefined' ? I18N.bundle() : {};
        const msg = isCompTurn ? (_td.compTurn || '컴퓨터') + ' 차례' : (_td.userTurn || '사용자') + ' 차례 (Enter로 바로 넘김)';
                document.getElementById('stMsg').innerText = msg;
                
                timer = setTimeout(() => {
                    clearInterval(timerInterval);
                    document.getElementById('timerMsg').innerText = '';
                    currentIndex++;
                    logStudy(1);
                    runDialog();
                }, waitTime * 1000);
            } else {
                if (gaugeTimer) clearInterval(gaugeTimer);
                document.getElementById('progressBar').style.width = "0%";
                document.getElementById('timerMsg').innerText = ''; // 타이머 초기화
                const _td2 = typeof I18N !== 'undefined' ? I18N.bundle() : {};
        const msg = isCompTurn ? (_td2.compTurn || '컴퓨터') + ' 차례 (Enter/다음)' : (_td2.userTurn || '사용자') + ' 차례 (Enter/다음)';
                document.getElementById('stMsg').innerText = msg;
                
                if (isCompTurn && document.getElementById('autoSpeak').checked) {
                    speak(item.text);
                }
            }
        }

        function nextDialogLine() {
            const mode = getCurrentMode();
            if (mode !== 'dialogMode' || !isRunning) return;
            
            // 기존 타이머가 있다면 클리어
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            if (gaugeTimer) {
                clearInterval(gaugeTimer);
                gaugeTimer = null;
            }
            
            document.getElementById('timerMsg').innerText = ''; // 🎨 타이머 표시 초기화
            
            const item = dialogScript[currentIndex];
            const roleA = document.getElementById('dialogRoleA').value;
            const isCompTurn = item.role === roleA;
            
            // 사용자 차례이거나 수동 모드일 때 다음으로 넘어감
            currentIndex++;
            logStudy(1);
            runDialog();
        }

window.runDialog = runDialog;
window.nextDialogLine = nextDialogLine;
