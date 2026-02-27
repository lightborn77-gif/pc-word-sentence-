// ui_stats.js - 통계 UI 및 학습 로그
// 의존: state.js, storage.js

function updateStats() {
    if (vocabulary.length === 0) return;

    const today = new Date().toISOString().slice(0,10);
    
    const totalWords = vocabulary.length;
    const safeCount = vocabulary.filter(v => v.isSafe).length;
    const memRate = totalWords > 0 ? Math.round(safeCount / totalWords * 100) : 0;

    const todayCount = studyLog[today] || 0;
    let weekCount = 0;
    for (let i = 0; i < 7; i++) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0,10);
        weekCount += studyLog[d] || 0;
    }

    const recentQuiz = totalQuizHistory.filter(h => {
        const diffDays = (Date.now() - new Date(h.date).getTime()) / 86400000;
        return diffDays < 30;
    });
    const correct = recentQuiz.filter(h => h.ok).length;
    const quizRate = recentQuiz.length > 0 ? Math.round(correct / recentQuiz.length * 100) : 0;

    let streak = 0;
    for (let i = 0; i < 365; i++) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0,10);
        if (studyLog[d]) streak++;
        else if (i > 0) break;
    }

    document.getElementById('todayCount').innerText = todayCount;
    document.getElementById('weekCount').innerText = weekCount;
    document.getElementById('memRate').innerText = memRate + "%";
    document.getElementById('quizRate').innerText = quizRate + "%";
    document.getElementById('streakNum').innerText = streak;

    let chartHtml = '';
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        last7Days.push({
            date: d.toISOString().slice(5,10).replace('-','/'),
            count: studyLog[d.toISOString().slice(0,10)] || 0
        });
    }
    const maxVal = Math.max(1, ...last7Days.map(d => d.count));
    last7Days.forEach(day => {
        const width = (day.count / maxVal * 100);
        chartHtml += `<div style="display:flex;align-items:center;margin:6px 0;">
            <div style="width:45px;font-size:12px;">${day.date}</div>
            <div style="flex:1;background:#eee;border-radius:5px;overflow:hidden;height:20px;">
                <div class="chart-bar" style="width:${width}%;">${day.count || ''}</div>
            </div>
        </div>`;
    });
    document.getElementById('weekChart').innerHTML = chartHtml;

    const wrongSorted = vocabulary.filter(v => v.w > 0).sort((a,b) => b.w - a.w).slice(0,5);
    document.getElementById('topWrongList').innerHTML = wrongSorted.length ? 
        wrongSorted.map(v => `<div style="margin:6px 0;padding:4px;background:white;border-radius:4px;">${v.word} → ${v.meaning} <strong style="color:#e74c3c;">${v.w}번</strong></div>`).join('') :
        '<div style="color:#28a745;">' + ((typeof I18N !== 'undefined' ? I18N.bundle() : {}).noWrongWords || '아직 틀린 단어가 없어요!') + '</div>';
}

function logStudy(count = 1) {
    const today = new Date().toISOString().slice(0,10);
    studyLog[today] = (studyLog[today] || 0) + count;
    Storage.setJSON('studyLog', studyLog);
    updateStats();
}

function renderReport() {
     // ... (기존 renderReport 로직 그대로 유지) ...
    const ok = quizHistory.filter(h => h.ok).length;
    document.getElementById('repSum').innerText = `${(typeof I18N !== 'undefined' ? I18N.bundle() : {}).quizScore || '결과'}: ${ok} / ${quizHistory.length} (${Math.round(ok / quizHistory.length * 100)}%)`;
    
    document.getElementById('repTbody').innerHTML = quizHistory.map((h, i) => {
        const resultMark = h.ok 
            ? `<span class="text-correct">O</span>` 
            : `<span class="text-wrong">X (${h.u})</span>`;
        
        return `<tr>
            <td>${h.q}</td>
            <td>${h.a}</td>
            <td>${resultMark}</td>
            <td><span class="speaker-btn" onclick="speakReportByIndex(${i})">🔊</span></td>
        </tr>`;
    }).join('');
    
    document.getElementById('reportModal').style.display = 'flex';
}

// 전역 노출
window.updateStats = updateStats;
window.logStudy = logStudy;
window.renderReport = renderReport;
