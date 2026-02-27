// engine_quiz.js - extracted from app.js (PC)
// 수정: App.State 기반으로 전역 변수 참조 변경

function showQuiz() {
    // App.State 참조 가져오기
    const App = window.App || {};
    const State = App.State || {};
    const Storage = window.Storage || {};
    
    // State에서 필요한 변수들 가져오기
    const isRunning = App.State?.runtime?.isRunning || false;
    let currentIndex = State.runtime?.currentIndex !== undefined ? State.runtime.currentIndex : (window.currentIndex || 0);
    const currentPool = State.currentPool || window.currentPool || [];
    const vocabulary = State.vocabulary || window.vocabulary || [];
    let quizHistory = State.quizHistory || window.quizHistory || [];
    let totalQuizHistory = State.totalQuizHistory || window.totalQuizHistory || [];
    let timer = State.timer || window.timer;
    
    // 퀴즈 종료 체크
    if (!isRunning || currentIndex >= currentPool.length) { 
        if (window.stopApp) window.stopApp(); 
        if (window.renderReport) window.renderReport(); 
        return; 
    }
    
    const item = currentPool[currentIndex];
    const todayIso = new Date().toISOString().slice(0, 10);
    
    const s = parseInt(document.getElementById('startIdx').value) || 1;
    const e = parseInt(document.getElementById('endIdx').value) || 9999;

    let direction = 'wordToMeaning'; 
    if (document.getElementById('korToEng')?.checked) direction = 'meaningToWord';
    else if (document.getElementById('mixedDir')?.checked) direction = Math.random() < 0.5 ? 'wordToMeaning' : 'meaningToWord';
    
    let questionText, correctAnswer, speakText;
    if (direction === 'meaningToWord') { 
        questionText = item.meaning; 
        correctAnswer = item.word; 
        speakText = item.word; 
    } else { 
        questionText = item.word; 
        correctAnswer = item.meaning; 
        speakText = item.word; 
    }
    
    const main = document.getElementById('mainDisplay');
    if (!main) return;
    
    main.innerText = questionText;
    main.style.fontSize = document.getElementById('fontSize')?.value + "px" || "36px";
    
    // 🎨 색상 및 별표 로직 재적용 (updateDisplay의 내용을 간소화)
    let displayColor = getComputedStyle(document.body).getPropertyValue('--text-primary'); 
    
    const toggleLearning = document.getElementById('toggleColorLearning')?.checked;
    const toggleWrong = document.getElementById('toggleColorWrong')?.checked;
    const toggleSafe = document.getElementById('toggleColorSafe')?.checked;

    if (item.isSafe) {
        if (toggleSafe) { displayColor = getComputedStyle(document.body).getPropertyValue('--color-safe'); }
    } else if (item.w > 0) {
        if (toggleWrong) { displayColor = getComputedStyle(document.body).getPropertyValue('--color-wrong'); }
    } else {
        if (toggleLearning) { displayColor = getComputedStyle(document.body).getPropertyValue('--color-learning'); }
    }
    
    main.style.color = displayColor;
    main.style.fontWeight = "bold";

    let iconHtml = main.innerText;
    if (item.isSafe) { 
        iconHtml += `<span style="font-size:0.6em; color:#17a2b8; margin-left:10px;">✅</span>`;
    } 
    else if (item.w > 0) {
        let stars = "";
        let starColor = "#FFD700"; 
        if (item.w <= 5) {
            stars = "★".repeat(item.w);
        } else {
            stars = "★";
            starColor = "#e74c3c"; 
        }
        iconHtml += `<span style="font-size:0.6em; color:${starColor}; margin-left:10px;">${stars}</span>`;
    }
    main.innerHTML = `<span class="speaker-btn" onclick="manualSpeak()">🔊</span> ${iconHtml}`;
    // /색상 및 별표 로직 재적용 끝

    const subDisplay = document.getElementById('subDisplay');
    if (subDisplay) subDisplay.style.display = 'none';
    
    const qa = document.getElementById('quizArea'); 
    if (!qa) return;
    
    qa.style.display = 'grid'; 
    qa.innerHTML = "";
    
    const cntMsg = document.getElementById('cntMsg');
    if (cntMsg) cntMsg.innerText = `${currentIndex + 1} / ${currentPool.length}`;
    
    if (document.getElementById('autoSpeak')?.checked && direction === 'wordToMeaning' && window.speak) {
        window.speak(speakText);
    }

    const correctText = direction === 'meaningToWord' ? item.word : item.meaning;
    
    // 💡 최적화: 오답 선택지 생성 시 전체 vocabulary 대신 범위 내 소규모 샘플 사용
    const allWordsInRange = vocabulary.filter(v => v.num >= s && v.num <= e);
    const sampleSize = Math.min(allWordsInRange.length, 50); // 최대 50개의 샘플만 사용
    
    // 무작위로 50개(이하)의 샘플 단어 추출
    const sampleDistractors = allWordsInRange
        .sort(() => 0.5 - Math.random())
        .slice(0, sampleSize);

    // 추출된 샘플에서 오답 3개 선정
    const wrongOptions = sampleDistractors
        .filter(v => (direction === 'meaningToWord' ? v.word : v.meaning) !== correctText)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
    // /최적화 끝

    let optionsTexts = [correctText];
    wrongOptions.forEach(opt => {
        const optText = direction === 'meaningToWord' ? opt.word : opt.meaning;
        if (!optionsTexts.includes(optText)) { 
            optionsTexts.push(optText);
        }
    });
    while(optionsTexts.length > 4) optionsTexts.pop();
    optionsTexts.sort(() => 0.5 - Math.random());

    const numberEmojis = ['①', '②', '③', '④'];
    optionsTexts.forEach((optText, i) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-btn';
        btn.innerText = `${numberEmojis[i]} ${optText}`;
        
        btn.onclick = () => {
            // 현재 상태 다시 확인
            const currentIsRunning = App.State?.runtime?.isRunning || false;
            if (!currentIsRunning) return;
            
            // 타이머 클리어
            const currentTimer = App.State?.timer || window.timer;
            if (currentTimer) {
                clearTimeout(currentTimer);
                if (App.State) App.State.timer = null;
                if (window.timer !== undefined) window.timer = null;
            }

            const isCorrect = optText === correctAnswer;
            
            // quizHistory 업데이트
            const historyItem = { q: questionText, a: correctAnswer, u: optText, ok: isCorrect };
            if (App.State?.pushBounded) { 
                App.State.pushBounded(quizHistory, historyItem, 3000); 
            } else { 
                quizHistory.push(historyItem); 
                if (App.State) App.State.quizHistory = quizHistory;
                if (window.quizHistory !== undefined) window.quizHistory = quizHistory;
            }
            
            // totalQuizHistory 업데이트
            totalQuizHistory.push({ ok: isCorrect, date: todayIso });
            if (Storage.setJSON) Storage.setJSON('totalQuiz', totalQuizHistory);
            if (App.State) App.State.totalQuizHistory = totalQuizHistory;
            if (window.totalQuizHistory !== undefined) window.totalQuizHistory = totalQuizHistory;

            const originalItem = vocabulary.find(v => v.num === item.num);
            
            if (originalItem) {
                originalItem.quizCount = (originalItem.quizCount || 0) + 1;

                const getCurrentMode = window.getCurrentMode || (App.Settings?.getCurrentMode);
                const currentMode = getCurrentMode ? getCurrentMode() : 'quizMode';
                
                if (currentMode === 'srsMode' && window.updateSRS) {
                    window.updateSRS(originalItem, isCorrect);
                } else {
                    if (isCorrect) {
                        originalItem.m = true;
                        originalItem.correctStreak = (originalItem.correctStreak || 0) + 1;
                        originalItem.totalCorrect = (originalItem.totalCorrect || 0) + 1;
                        
                        if (originalItem.correctStreak >= 5 || originalItem.totalCorrect >= 10) {
                            originalItem.isSafe = true;
                            originalItem.w = 0;
                        } else {
                            originalItem.w = Math.max(0, originalItem.w - 1);
                        }

                    } else {
                        originalItem.w = (originalItem.w || 0) + 1;
                        originalItem.correctStreak = 0;
                        originalItem.isSafe = false;
                        
                        if (!originalItem.wrongDates) originalItem.wrongDates = [];
                        if (!originalItem.wrongDates.includes(todayIso)) {
                            originalItem.wrongDates.push(todayIso);
                        }
                    }
                }
                Object.assign(item, originalItem);
            }

            if (isCorrect) {
                btn.classList.add('correct');
            } else {
                btn.classList.add('wrong');
                if (document.getElementById('hint')?.checked) {
                    qa.querySelectorAll('.quiz-btn').forEach(b => {
                        if (b.innerText.includes(correctAnswer)) b.classList.add('correct');
                    });
                }
            }
            
            if (window.saveLocal) window.saveLocal();
            if (window.logStudy) window.logStudy(1); 
            if (window.updateStats) window.updateStats(); 
            
            if (direction === 'meaningToWord' && document.getElementById('autoSpeak')?.checked) {
                setTimeout(() => {
                    if (window.speak) window.speak(item.word);
                }, 100);
            }
            
            const progress = ((currentIndex + 1) / currentPool.length) * 100;
            const progressBar = document.getElementById('progressBar');
            if (progressBar) progressBar.style.width = progress + "%";
            
            // 다음 문제로 이동
            const newTimer = setTimeout(() => { 
                currentIndex++;
                if (App.State?.runtime) App.State.runtime.currentIndex = currentIndex;
                if (window.currentIndex !== undefined) window.currentIndex = currentIndex;
                showQuiz(); 
            }, parseFloat(document.getElementById('quizDelay')?.value || 3) * 1000);
            
            if (App.State) App.State.timer = newTimer;
            if (window.timer !== undefined) window.timer = newTimer;
        };
        qa.appendChild(btn);
    });
    
    if (window.runBar) {
        window.runBar(parseFloat(document.getElementById('quizDelay')?.value || 3) * 1000);
    }
}
