function _loadFile(e) {
            const file = e.target.files[0]; 
            if(!file) return;
            
            const reader = new FileReader();
            
            reader.onerror = () => {
                alert(I18N.bundle().err_file_read);
                document.getElementById('stMsg').innerText = I18N.bundle().err_file_load;
            };
            
            reader.onload = ev => {
                try {
                    const content = ev.target.result;
                    const lines = content.split(/\r?\n/);
                    
                    // 🔍 파일 형식 자동 감지
                    const fileType = FileLoader.detectFileType(lines);
                    
                    if (fileType === 'vocabulary') {
                        FileLoader.loadVocabularyData(content, file.name);
                    } else if (fileType === 'dialog') {
                        FileLoader.loadDialogData(content, file.name);
                    } else {
                        alert(I18N.bundle().err_file_format);
                        document.getElementById('stMsg').innerText = I18N.bundle().err_format_unknown;
                    }
                    
                } catch(err) {
                    alert(I18N.bundle().err_processing + err.message);
                    document.getElementById('stMsg').innerText = I18N.bundle().err_process_fail;
                }
            };
            
            reader.readAsText(file, 'UTF-8');
        }

function _detectFileType(lines) {
            // 처음 20줄 검사
            const sampleLines = lines.slice(0, 20).map(l => l.trim()).filter(l => l.length > 0);
            
            let vocabScore = 0;
            let dialogScore = 0;
            
            for (const line of sampleLines) {
                // 단어장 패턴: "1. apple" 또는 "1 apple"
                if (/^\d+\s*[\.\s-]+/.test(line)) {
                    vocabScore += 2;
                }
                
                // 회화 패턴: "A: Hello" 또는 "B: Hi"
                if (/^[AB]\s*:\s*.+/i.test(line)) {
                    dialogScore += 2;
                }
            }
            
            // 점수가 높은 쪽으로 판정
            if (vocabScore > dialogScore && vocabScore >= 2) return 'vocabulary';
            if (dialogScore > vocabScore && dialogScore >= 2) return 'dialog';
            
            return 'unknown';
        }

function _loadVocabularyData(content, fileName) {
            const App = window.App || {};
            
            const map = {};
            content.split(/\r?\n/).forEach(line => {
                const cleanLine = line.trim()
                    .replace(/\([^)]*\)/g, '')
                    .replace(/[✅🟢❌]/g, '');
                
                const match = cleanLine.match(/^(\d+)\s*[\.\s-]*\s*([\s\S]+)/);
                if (match) {
                    const num = parseInt(match[1]); 
                    const txt = match[2].trim();
                    if (!map[num]) map[num] = { 
                        num, word: "", meaning: "", w: 0, m: false, wrongDates: [], 
                        quizCount: 0, correctStreak: 0, totalCorrect: 0, isSafe: false 
                    }; 
                    
                    if (/[a-zA-Z]/.test(txt) && !/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(txt)) { 
                        if(!map[num].word) map[num].word = txt; 
                    } else {
                        map[num].meaning = map[num].meaning ? map[num].meaning + ", " + txt : txt;
                    }
                }
            });
            
            const vocabulary = Object.values(map).filter(v => v.word && v.meaning).sort((a,b) => a.num - b.num);
            
            if(vocabulary.length === 0) {
                alert(I18N.bundle().err_no_words);
                document.getElementById('stMsg').innerText = I18N.bundle().err_no_words_status;
                return;
            }

            vocabulary.forEach(item => {
                if (!item.hasOwnProperty('lastSeen')) item.lastSeen = null;
                if (!item.hasOwnProperty('interval')) item.interval = 1;
                if (!item.hasOwnProperty('ease')) item.ease = 2.5;
                if (!item.hasOwnProperty('wrongDates')) item.wrongDates = []; 
                if (!item.hasOwnProperty('quizCount')) item.quizCount = 0;
                if (!item.hasOwnProperty('correctStreak')) item.correctStreak = 0;
                if (!item.hasOwnProperty('totalCorrect')) item.totalCorrect = 0;
                if (!item.hasOwnProperty('isSafe')) item.isSafe = false;
            });

            if(vocabulary.length > 0) { 
                document.getElementById('startIdx').value = vocabulary[0].num; 
                document.getElementById('endIdx').value = vocabulary[vocabulary.length-1].num; 
            }
            
            const saved = Storage.get('mem_'+fileName);
            if(saved) {
                try {
                    JSON.parse(saved).forEach(s => {
                        // 기존 저장 데이터 하위호환 처리 (eng/kor → word/meaning)
                        if (s.eng && !s.word) s.word = s.eng;
                        if (s.kor && !s.meaning) s.meaning = s.kor;
                        const it = vocabulary.find(v=>v.num===s.n); 
                        if(it){
                            it.m = s.m; it.w = s.w;
                            if (s.lastSeen) it.lastSeen = s.lastSeen;
                            if (s.interval) it.interval = s.interval;
                            if (s.wrongDates) it.wrongDates = s.wrongDates; 
                            if (s.quizCount) it.quizCount = s.quizCount;
                            if (s.correctStreak) it.correctStreak = s.correctStreak;
                            if (s.totalCorrect) it.totalCorrect = s.totalCorrect;
                            if (s.isSafe !== undefined) it.isSafe = s.isSafe;
                        }
                    });
                } catch(e) {
                    console.warn('[parser] 저장 진행 데이터 손상, 무시:', e);
                }
            }
            
            // State 모듈 사용 (있으면)
            if (App.State?.setVocab) {
                App.State.setVocab(vocabulary, fileName);
            } else {
                // 레거시: 전역 변수 직접 할당
                window.vocabulary = vocabulary;
                window.currentFileName = fileName;
            }
            
            // 회화 데이터 초기화 (단어장 로드 시)
            if (App.State?.setDialog) {
                App.State.setDialog([], '');
            } else {
                window.dialogScript = [];
                window.dialogFileName = '';
            }
            
            document.getElementById('stMsg').innerText = `${I18N.bundle().status_vocab_loaded} ${vocabulary.length}${I18N.bundle().status_vocab_count}`;
            if (typeof clearCache === 'function') clearCache();
            // currentIndex 리셋: 새 파일 로드 시 첫 번째 단어부터 표시
            if (typeof window.currentIndex !== 'undefined') window.currentIndex = 0;
            // currentPool도 채워줌 (isRunning=false일 때 updateDisplay가 pool을 못 얻을 경우 대비)
            if (typeof getFiltered === 'function') {
                try { window.currentPool = getFiltered(); } catch(e) {}
            }
            if (typeof updateDisplay === 'function') updateDisplay();
            // DOM 렌더링 사이클 후 한 번 더 갱신 (안전 보장)
            setTimeout(() => {
                if (typeof updateDisplay === 'function') updateDisplay();
            }, 50);
            if (typeof updateStats === 'function') updateStats();
        }

function _loadDialogData(content, fileName) {
            const App = window.App || {};
            
            const lines = content.split(/\r?\n/);
            const dialogScript = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                const match = line.match(/^(A|B):\s*(.+)/i);
                
                if (match) {
                    const role = match[1].toUpperCase();
                    const text = match[2].trim();
                    
                    let translation = "";
                    if (i + 1 < lines.length) {
                        const nextLine = lines[i + 1].trim();
                        if (nextLine && !nextLine.match(/^(A|B):/i)) {
                            translation = nextLine;
                            i++;
                        }
                    }
                    
                    dialogScript.push({ role, text, translation });
                }
            }
            
            if(dialogScript.length === 0) {
                alert(I18N.bundle().err_no_dialog);
                document.getElementById('stMsg').innerText = I18N.bundle().err_no_dialog_status;
                return;
            }
            
            // State 모듈 사용 (있으면)
            if (App.State?.setDialog) {
                App.State.setDialog(dialogScript, fileName);
                // 단어장 데이터 초기화 (회화 로드 시)
                App.State.setVocab([], '');
            } else {
                // 레거시: 전역 변수 직접 할당
                window.dialogScript = dialogScript;
                window.dialogFileName = fileName;
                window.vocabulary = [];
                window.currentFileName = '';
            }
            
            // 회화 모드로 직접 전환 (라디오 버튼 없이)
            // 라디오 버튼 찾아서 체크하려고 하면 에러 발생 가능하므로 직접 변수 변경
            const modeRadios = document.getElementsByName('modeSelect');
            if (modeRadios && modeRadios.length > 0) {
                for (let radio of modeRadios) {
                    if (radio.value === 'dialogMode') {
                        radio.checked = true;
                        break;
                    }
                }
                if (typeof modeToggle === 'function') modeToggle(); // 라디오 버튼 있으면 modeToggle 호출
            }
            
            document.getElementById('stMsg').innerText = `${I18N.bundle().status_dialog_loaded} ${dialogScript.length}${I18N.bundle().status_dialog_count}`;
            currentIndex = 0;
            clearCache();
            updateDisplay();
        }

const FileLoader = {
            loadFile: _loadFile,
            detectFileType: _detectFileType,
            loadVocabularyData: _loadVocabularyData,
            loadDialogData: _loadDialogData
        };
window.FileLoader = FileLoader;
