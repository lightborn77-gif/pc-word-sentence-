// engine_shadow.js - 쉐도잉 모드 실행 엔진
// 의존: state.js, tts.js, ui_render_core.js, engine_study.js(stopApp)

        // ===== Shadowing (Stable) =====
        let shadowTimer = null;
        let shadowStopFlag = false;
        let shadowFinishFlag = false;

        function setShadowFinishBtnVisible(visible) {
            const btn = document.getElementById('shadowFinishBtn');
            if (btn) btn.style.display = visible ? 'inline-block' : 'none';
        }

        function finishShadowing() {
            shadowFinishFlag = true;
        }

        function speakShadowStable(text, rateOverride, callback) {
            return TTS.speakShadowStable(text, rateOverride, callback);
        }

        function runShadowingStable() {
            if (!isRunning) return;
            if (!dialogScript || dialogScript.length < 2) {
                alert(I18N.bundle().err_load_dialog);
                return;
            }

            shadowStopFlag = false;
            shadowFinishFlag = false;
            setShadowFinishBtnVisible(true);

            // 시작 시 한 번만 큐 정리
            window.speechSynthesis.cancel();

            const mySec = parseFloat(document.getElementById('shadowMyTime').value);
            const myDelay = (isNaN(mySec) ? 0 : mySec) * 1000;
            const shadowRateEl = document.getElementById('shadowRate');
            const rate = shadowRateEl ? (parseFloat(shadowRateEl.value) || 1.0) : 1.0;
            const rateA = rate;
            const rateB = rate;
            const systemRest = 250;

            let pairBase = currentIndex - (currentIndex % 2);
            let pairRepeatCount = 0; // 현재 세트 반복 횟수 카운터

            function loopEnabled() {
                const el = document.getElementById('shadowLoop');
                return el ? el.checked : false;
            }
            function getLoopCount() {
                const el = document.getElementById('shadowLoopCount');
                const v = el ? parseInt(el.value) : 2;
                return isNaN(v) || v < 0 ? 2 : v; // 0=무한, 양수=횟수
            }

            function ensurePair() {
                if (pairBase < 0) pairBase = 0;
                if (pairBase >= dialogScript.length) return false;
                return !!(dialogScript[pairBase] && dialogScript[pairBase + 1]);
            }

            function stepA(isRepeat) {
                if (shadowStopFlag) return;
                if (!ensurePair()) { stopApp(); return; }
                if (!isRepeat) pairRepeatCount = 0; // 새 세트 진입 시 카운터 리셋

                const A = dialogScript[pairBase];

                currentIndex = pairBase;
                window.currentReadingRole = 'A';
                updateDisplay();

                speakShadowStable(A.text, rateA, () => {
                    if (shadowStopFlag) return;
                    shadowTimer = setTimeout(() => {
                        if (shadowStopFlag) return;
                        shadowTimer = setTimeout(() => { if (!shadowStopFlag) stepB(); }, myDelay);
                    }, systemRest);
                });
            }

            function stepB() {
                if (shadowStopFlag) return;
                if (!ensurePair()) { stopApp(); return; }

                const B = dialogScript[pairBase + 1];

                currentIndex = pairBase + 1;
                window.currentReadingRole = 'B';
                updateDisplay();

                speakShadowStable(B.text, rateB, () => {
                    if (shadowStopFlag) return;
                    shadowTimer = setTimeout(() => {
                        if (shadowStopFlag) return;
                        shadowTimer = setTimeout(() => {
                            if (shadowStopFlag) return;

                            if (shadowFinishFlag) { stopApp(); return; }

                            if (loopEnabled()) {
                                const maxCount = getLoopCount();
                                pairRepeatCount++;
                                if (maxCount === 0 || pairRepeatCount < maxCount) {
                                    // 무한(0) 또는 아직 횟수 남음 → 현재 세트 반복
                                    shadowTimer = setTimeout(() => { if (!shadowStopFlag) stepA(true); }, systemRest);
                                } else {
                                    // 횟수 완료 → 다음 세트로
                                    pairBase += 2;
                                    shadowTimer = setTimeout(() => { if (!shadowStopFlag) stepA(false); }, systemRest);
                                }
                            } else {
                                pairBase += 2;
                                shadowTimer = setTimeout(() => { if (!shadowStopFlag) stepA(false); }, systemRest);
                            }
                        }, myDelay);
                    }, systemRest);
                });
            }

            stepA();
        }

window.finishShadowing = finishShadowing;
window.runShadowingStable = runShadowingStable;
window.setShadowFinishBtnVisible = setShadowFinishBtnVisible;
