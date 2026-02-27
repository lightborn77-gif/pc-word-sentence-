// ui_render_core.js - extracted from app.js (PC)
// NOTE: Shared DOM helper. Use var + window.$id to avoid 'already been declared' when multiple scripts load.
var $id = window.$id || ((window.DomCache && DomCache.byId) ? DomCache.byId : (id)=>document.getElementById(id));
window.$id = $id;

// 📖 네이버 사전 URL 생성 (단어 깜박이 모드)
function getNaverDictUrl(word, lang) {
    const encoded = encodeURIComponent(word);
    const urlMap = {
        'en': `https://dict.naver.com/search.nhn?query=${encoded}`,
        'ja': `https://jdict.naver.com/search?query=${encoded}`,
        'zh': `https://zh.dict.naver.com/search?query=${encoded}`,
        'fr': `https://frdict.naver.com/search?query=${encoded}`,
        'es': `https://esdict.naver.com/search?query=${encoded}`,
        'de': `https://dedict.naver.com/search?query=${encoded}`
    };
    return urlMap[lang] || `https://www.google.com/search?q=${encodeURIComponent(lang)}+dictionary+${encoded}`;
}

// 🎬 Youglish URL 생성 (회화 모드)
function getYouglishUrl(sentence, lang) {
    const encoded = encodeURIComponent(sentence);
    const langMap = {
        'en': 'english', 'es': 'spanish', 'fr': 'french', 'de': 'german',
        'it': 'italian', 'pt': 'portuguese', 'ru': 'russian',
        'zh': 'chinese', 'ja': 'japanese', 'ar': 'arabic', 'hi': 'hindi',
        'ko': 'korean'
    };
    const youglishLang = langMap[lang] || 'english';
    return `https://youglish.com/pronounce/${encoded}/${youglishLang}`;
}
function updateDisplay() {
            const mode = getCurrentMode();
            
            if (mode === 'dialogMode') {
                $id('subDisplay').style.display = 'block';
                $id('subDisplay').style.visibility = 'visible';
                $id('quizArea').style.display = 'none';
                document.querySelector('.progress').style.display = 'none'; // 회화모드에서 진행바 숨김
                if (dialogScript.length === 0) {
                    $id('mainDisplay').innerText = I18N.bundle().dialog_load_msg;
                    $id('subDisplay').innerText = "";
                    $id('cntMsg').innerText = "0 / 0";
                    return;
                }
                
                if (currentIndex >= dialogScript.length) {
                    $id('mainDisplay').innerText = I18N.bundle().dialog_end;
                    $id('subDisplay').innerText = "";
                    $id('cntMsg').innerText = `${dialogScript.length} / ${dialogScript.length}`;
                    return;
                }

                const showBoth = $id('dialogShowBoth').checked;
                const item = dialogScript[currentIndex];
                const main = $id('mainDisplay');
                
                if (showBoth) {
                    // AB 동시 표시 모드
                    const roleA = $id('dialogRoleA').value;
                    
                    // 현재 대화에서 A와 B 파트 찾기
                    let partA = null;
                    let partB = null;
                    
                    // 현재 인덱스부터 시작해서 다음 대화까지 A와 B 찾기
                    for (let i = currentIndex; i < dialogScript.length; i++) {
                        const scriptItem = dialogScript[i];
                        if (scriptItem.role === 'A' && !partA) {
                            partA = scriptItem;
                        } else if (scriptItem.role === 'B' && !partB) {
                            partB = scriptItem;
                        }
                        
                        // 둘 다 찾았으면 종료
                        if (partA && partB) break;
                        
                        // 다음 대화 세트로 넘어가면 종료
                        if (i > currentIndex && (scriptItem.role === 'A' || scriptItem.role === 'B')) {
                            if ((partA && scriptItem.role === 'A') || (partB && scriptItem.role === 'B')) {
                                break;
                            }
                        }
                    }
                    
                    // 만약 현재부터 시작해서 못 찾았으면, 이전 것도 확인
                    if (!partA || !partB) {
                        for (let i = currentIndex - 1; i >= 0; i--) {
                            const scriptItem = dialogScript[i];
                            if (!partA && scriptItem.role === 'A') partA = scriptItem;
                            if (!partB && scriptItem.role === 'B') partB = scriptItem;
                            if (partA && partB) break;
                        }
                    }
                    
                    const fontSize = parseInt($id('fontSize').value);
                    const _sbLang = ($id('studyLangSelect') ? $id('studyLangSelect').value : 'en');
                    
                    let html = '<div class="dialog-both-container">';
                    
                    if (partA) {
                        const isReading = (window.currentReadingRole === 'A');
                        const colorA = getComputedStyle(document.body).getPropertyValue('--color-dialog-a');
                        const youglishA = `<a href="${getYouglishUrl(partA.text, _sbLang)}" target="_blank" onclick="event.stopPropagation();" style="font-size:0.4em; vertical-align:middle; opacity:0.5; margin-left:8px; text-decoration:none;">🎬</a>`;
                        html += `
                            <div class="dialog-line ${isReading ? 'reading' : ''}" style="border-left: 4px solid ${colorA};">
                                <div class="dialog-line-header" style="color: ${colorA};">[A]</div>
                                <div class="dialog-line-text" style="font-size: ${fontSize}px; color: ${colorA};">${partA.text}${youglishA}</div>
                                ${partA.translation ? `<div class="dialog-line-translation">${partA.translation}</div>` : ''}
                            </div>
                        `;
                    }
                    
                    if (partB) {
                        const isReading = (window.currentReadingRole === 'B');
                        const colorB = getComputedStyle(document.body).getPropertyValue('--color-dialog-b');
                        const youglishB = `<a href="${getYouglishUrl(partB.text, _sbLang)}" target="_blank" onclick="event.stopPropagation();" style="font-size:0.4em; vertical-align:middle; opacity:0.5; margin-left:8px; text-decoration:none;">🎬</a>`;
                        html += `
                            <div class="dialog-line ${isReading ? 'reading' : ''}" style="border-left: 4px solid ${colorB};">
                                <div class="dialog-line-header" style="color: ${colorB};">[B]</div>
                                <div class="dialog-line-text" style="font-size: ${fontSize}px; color: ${colorB};">${partB.text}${youglishB}</div>
                                ${partB.translation ? `<div class="dialog-line-translation">${partB.translation}</div>` : ''}
                            </div>
                        `;
                    }
                    
                    html += '</div>';
                    
                    main.innerHTML = html;
                    $id('subDisplay').innerHTML = "";
                    $id('subDisplay').style.display = 'none';
                    
                } else {
                    // 기존 순차 표시 모드
                    const _dialogLang = ($id('studyLangSelect') ? $id('studyLangSelect').value : 'en');
                    const _youglishUrl = getYouglishUrl(item.text, _dialogLang);
                    const _youglishIcon = `<a href="${_youglishUrl}" target="_blank" onclick="event.stopPropagation();" style="font-size:0.4em; vertical-align:middle; opacity:0.5; margin-left:8px; text-decoration:none;">🎬</a>`;
                    main.innerHTML = `<span style="font-size:0.8em; margin-right:10px;">[${item.role}]</span> ${item.text}${_youglishIcon}`;
                    main.style.fontSize = $id('fontSize').value + "px";
                    
                    // 역할에 따른 색상 변경
                    const roleA = $id('dialogRoleA').value;
                    const isCompTurn = item.role === roleA;

                    main.style.color = getComputedStyle(document.body).getPropertyValue(isCompTurn ? '--color-dialog-a' : '--color-dialog-b');
                    main.style.fontWeight = "bold";
                    
                    // 서브 디스플레이에 한글 해석만 표시
                    const subDisplay = $id('subDisplay');
                    subDisplay.style.fontSize = (parseInt($id('fontSize').value) * 0.7) + "px";
                    subDisplay.style.display = 'block';
                    
                    if (item.translation) {
                        // 한글 해석이 있으면 표시
                        subDisplay.innerHTML = item.translation;
                    } else {
                        // 한글 해석이 없으면 빈 문자열
                        subDisplay.innerHTML = "";
                    }
                }
                
                $id('cntMsg').innerText = `${currentIndex + 1} / ${dialogScript.length}`;
                return;
            }

            // --- 기존 단어장 모드 로직 (dialogMode가 아닐 때) ---
            document.querySelector('.progress').style.display = 'block'; // 단어장 모드에서 진행바 표시
            
            let pool;
            if (isRunning) {
                pool = currentPool;
            } else if (mode === 'srsMode') {
                pool = getSRSItems();
            } else if (mode === 'quizMode') {
                pool = getQuizPool(); 
            } else {
                pool = getFiltered();
            }

            if (pool.length === 0) { 
                const msg = mode === "srsMode" 
                    ? `<span class="lang-kr">오늘 복습할 단어가 없습니다!</span><span class="lang-en">No words to review today!</span>`
                    : `<span class="lang-kr">표시할 단어가 없습니다</span><span class="lang-en">No words to display</span>`;
                $id('mainDisplay').innerHTML = msg;
                $id('cntMsg').innerText = "0 / 0";
                $id('subDisplay').innerText = "";
                return;
            }
            if (currentIndex >= pool.length) currentIndex = 0;
            const item = pool[currentIndex];
            const main = $id('mainDisplay');
            
            // 🔍 독해/영작 모드 체크
            const readingMode = $id('readingMode') ? $id('readingMode').value : 'off';
            
            if (readingMode !== 'off' && window.readingStep !== undefined) {
                // 독해/영작 모드 표시
                if (readingMode === 'eng-kor') {
                    // 독해모드: 앞→뒤
                    main.innerText = window.readingStep === 0 ? item.word : item.meaning;
                } else if (readingMode === 'kor-eng') {
                    // 영작모드: 뒤→앞
                    main.innerText = window.readingStep === 0 ? item.meaning : item.word;
                }
                $id('subDisplay').style.display = 'none';
                $id('quizArea').style.display = 'none';
            } else if (mode === 'studyMode') {
                 // 앞면과 뒷면을 동시에 표시
                 main.innerText = item.word;
                 $id('subDisplay').innerText = item.meaning;
                 $id('subDisplay').style.display = 'block';
                 $id('subDisplay').style.visibility = 'visible';
                 $id('quizArea').style.display = 'none';
            } else if (mode === 'quizMode' || mode === 'srsMode') {
                 main.innerText = item.word;
                 $id('subDisplay').style.display = 'none';
                 $id('quizArea').style.display = 'none';
            }

            main.style.fontSize = $id('fontSize').value + "px";
            
            let displayColor = getComputedStyle(document.body).getPropertyValue('--text-primary');
            
            // 컬러 토글 상태 확인
            const toggleLearning = $id('toggleColorLearning').checked;
            const toggleWrong = $id('toggleColorWrong').checked;
            const toggleSafe = $id('toggleColorSafe').checked;

            if (item.isSafe) {
                if (toggleSafe) { displayColor = getComputedStyle(document.body).getPropertyValue('--color-safe'); }
            } else if (item.w > 0) {
                if (toggleWrong) { displayColor = getComputedStyle(document.body).getPropertyValue('--color-wrong'); }
            } else {
                if (toggleLearning) { displayColor = getComputedStyle(document.body).getPropertyValue('--color-learning'); }
            }
            
            main.style.color = displayColor;
            main.style.fontWeight = "bold";

            // ⭐️ 아이콘 표시
            const _wordLang = ($id('studyLangSelect') ? $id('studyLangSelect').value : 'en');
            const _naverUrl = getNaverDictUrl(item.word, _wordLang);
            const _dictIcon = `<a href="${_naverUrl}" target="_blank" onclick="event.stopPropagation();" style="font-size:0.45em; vertical-align:middle; opacity:0.5; margin-left:8px; text-decoration:none;">📖</a>`;
            let iconHtml = main.innerText + _dictIcon;
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
            main.innerHTML = iconHtml;
            $id('cntMsg').innerText = `${currentIndex + 1} / ${pool.length}`;
        }