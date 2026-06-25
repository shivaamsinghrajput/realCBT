var currentSelectedTestType = null;
var currentSelectedUrl = null;
var currentMode = 'exam';
var performanceChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Theme Sync
    const savedTheme = localStorage.getItem('mockos_theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    const themeBtn = document.getElementById('theme-toggle');
    
    if (themeBtn) {
        themeBtn.innerText = savedTheme === 'dark' ? "☀️ Light Mode" : "🌙 Dark Mode";
        themeBtn.addEventListener('click', () => {
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('mockos_theme', newTheme);
            themeBtn.innerText = newTheme === 'dark' ? "☀️ Light Mode" : "🌙 Dark Mode";
            if (performanceChartInstance) {
                loadChart(JSON.parse(localStorage.getItem('mockos_results')) || []);
            }
        });
    }

    // 2. Load Data
    const results = JSON.parse(localStorage.getItem('mockos_results')) || [];
    loadDashboardStats(results);
    loadChart(results);

    // 3. Fetch Library for the Archive Dropdown
    try {
        const response = await fetch('papers/data.json');
        const data = await response.json();
        renderMainsArchive(data);
    } catch (error) {
        console.error("Failed to load papers:", error);
    }
});

// --- Action Menu Toggle ---
function toggleMainsArchive() {
    const archive = document.getElementById('mains-archive-container');
    const card = document.getElementById('card-mains');
    
    if (archive.classList.contains('open')) {
        archive.classList.remove('open');
        card.classList.remove('active');
    } else {
        archive.classList.add('open');
        card.classList.add('active');
    }
}

function renderMainsArchive(data) {
    const container = document.getElementById('mains-archive-container');
    container.innerHTML = ""; 

    for (const [yearName, shifts] of Object.entries(data)) {
        let shiftButtonsHtml = "";
        for (const [shiftName, url] of Object.entries(shifts)) {
            shiftButtonsHtml += `<button class="shift-btn" onclick="openConfig('${yearName} - ${shiftName}', '${url}')">${shiftName}</button>`;
        }
        
        container.innerHTML += `
            <div class="sub-category">
                <div class="sub-header" onclick="this.parentElement.classList.toggle('active')">
                    ${yearName} <span>+</span>
                </div>
                <div class="sub-body">
                    <div class="shift-grid">${shiftButtonsHtml}</div>
                </div>
            </div>
        `;
    }
}

// --- Dynamic Stats Aggregation ---
function loadDashboardStats(results) {
    if (results.length === 0) return;

    let totals = { score: 0, p: 0, c: 0, m: 0, acc: 0, pAcc: 0, cAcc: 0, mAcc: 0, att: 0, pAtt: 0, cAtt: 0, mAtt: 0 };
    
    results.forEach(res => {
        totals.score += res.score; totals.p += res.physics; totals.c += res.chem; totals.m += res.math;
        totals.acc += res.accuracy; totals.att += res.attempted || 0;
    });

    const count = results.length;
    
    // Trend Line Math
    if (count > 1) {
        const trend = ((results[count - 1].score - results[0].score) / count).toFixed(2);
        const sign = trend >= 0 ? '+' : '';
        document.getElementById('score-trend-text').innerHTML = `Score change per exam attempted: <span style="color: ${trend >= 0 ? 'var(--nta-answered)' : 'var(--nta-unanswered)'}">${sign}${trend} marks</span>`;
    }

    // Populate the 6 Horizontal Vertical Cards
    document.getElementById('stat-avg-score').innerHTML = `${Math.round(totals.score/count)}<small>/300</small>`;
    document.getElementById('sub-avg-score').innerText = `P: ${Math.round(totals.p/count)} | C: ${Math.round(totals.c/count)} | M: ${Math.round(totals.m/count)}`;

    document.getElementById('stat-avg-acc').innerText = `${Math.round(totals.acc/count)}%`;
    // Mocked subject accuracy for now until engine calculates per subject
    document.getElementById('sub-avg-acc').innerText = `P: ${Math.round(totals.acc/count)}% | C: ${Math.round(totals.acc/count)}% | M: ${Math.round(totals.acc/count)}%`;

    document.getElementById('stat-avg-att').innerHTML = `${Math.round(totals.att/count)}<small>/75</small>`;
    
    // Time metrics mocked
    document.getElementById('stat-avg-time').innerHTML = `72<small>s</small>`;

    document.getElementById('stat-total-exams').innerText = count;

    const averages = [ { name: 'Physics', val: totals.p/count }, { name: 'Chemistry', val: totals.c/count }, { name: 'Maths', val: totals.m/count } ];
    averages.sort((a, b) => b.val - a.val);
    document.getElementById('stat-strong-sub').innerText = averages[0].name;
    document.getElementById('stat-strong-score').innerText = `Avg: ${Math.round(averages[0].val)}`;

    // Populate Scrollable History Table
    const tableBody = document.getElementById('dash-recent-table');
    if (tableBody) {
        tableBody.innerHTML = ""; 
        const recentResults = results.slice().reverse().slice(0, 50); 
        recentResults.forEach(res => {
            tableBody.innerHTML += `
                <tr>
                    <td>
                        <div class="test-name">${res.testName}</div>
                        <div class="test-date">${res.date} • ${res.accuracy}% Accuracy</div>
                    </td>
                    <td class="test-score">
                        ${res.score} <small>/300</small>
                        <div class="sub-score-text">P:${res.physics} C:${res.chem} M:${res.math}</div>
                    </td>
                </tr>
            `;
        });
    }
}

// --- Chart.js Integration with Toggles ---
function loadChart(results) {
    if (results.length === 0) return;

    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    if (performanceChartInstance) performanceChartInstance.destroy();

    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? '#27272a' : '#e5e7eb';
    const textColor = isDark ? '#a1a1aa' : '#6b7280';

    const chartData = results.slice(-30);
    const labels = chartData.map((_, i) => `T${results.length - chartData.length + i + 1}`);

    performanceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Total Score', data: chartData.map(r => r.score), borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.1)', fill: true, tension: 0.3, yAxisID: 'yScore', hidden: false },
                { label: 'Physics', data: chartData.map(r => r.physics), borderColor: '#8b5cf6', borderDash: [5, 5], fill: false, tension: 0.3, yAxisID: 'yScore', hidden: true },
                { label: 'Chemistry', data: chartData.map(r => r.chem), borderColor: '#eab308', borderDash: [5, 5], fill: false, tension: 0.3, yAxisID: 'yScore', hidden: true },
                { label: 'Maths', data: chartData.map(r => r.math), borderColor: '#ef4444', borderDash: [5, 5], fill: false, tension: 0.3, yAxisID: 'yScore', hidden: true },
                { label: 'Accuracy', data: chartData.map(r => r.accuracy), borderColor: '#10b981', fill: false, tension: 0.3, yAxisID: 'yAcc', hidden: false }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } }, 
            scales: {
                yScore: { type: 'linear', position: 'left', min: 0, max: 300, grid: { color: gridColor }, ticks: { color: textColor } },
                yAcc: { type: 'linear', position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false }, ticks: { color: textColor, callback: (v) => v + '%' } },
                x: { grid: { display: false }, ticks: { color: textColor } }
            }
        }
    });
}

function toggleDataset(datasetIndex, buttonElement) {
    if (!performanceChartInstance) return;
    const isHidden = performanceChartInstance.getDatasetMeta(datasetIndex).hidden;
    performanceChartInstance.getDatasetMeta(datasetIndex).hidden = !isHidden;
    performanceChartInstance.update();

    if (!isHidden) {
        buttonElement.classList.remove('active');
        buttonElement.style.borderColor = "var(--border-color)";
        buttonElement.style.color = "var(--text-muted)";
    } else {
        buttonElement.classList.add('active');
        const colors = ['#2563eb', '#8b5cf6', '#eab308', '#ef4444', '#10b981'];
        buttonElement.style.borderColor = colors[datasetIndex];
        buttonElement.style.color = colors[datasetIndex];
    }
}

// --- Configuration Modal & Routing ---
function openConfig(testName, url) {
    currentSelectedTestType = testName;
    currentSelectedUrl = url;
    document.getElementById('modal-title').innerText = `Configure: ${testName}`;
    
    const uploadGroup = document.getElementById('upload-group');
    uploadGroup.style.display = (url === 'local_upload') ? 'block' : 'none';

    document.getElementById('config-modal').classList.add('active');
}

function closeConfig() { document.getElementById('config-modal').classList.remove('active'); }

function setMode(mode) {
    currentMode = mode;
    const timerConfig = document.getElementById('timer-config');
    document.getElementById('mode-exam').classList.remove('active');
    document.getElementById('mode-practice').classList.remove('active');
    document.getElementById(`mode-${mode}`).classList.add('active');

    if (mode === 'practice') {
        timerConfig.style.opacity = '0.5';
        timerConfig.style.pointerEvents = 'none';
    } else {
        timerConfig.style.opacity = '1';
        timerConfig.style.pointerEvents = 'all';
    }
}

function launchTest() {
    const timeLimitMinutes = document.getElementById('test-timer').value;
    let finalUrl = currentSelectedUrl;

    if (finalUrl === 'local_upload') {
        const fileInput = document.getElementById('local-pdf-upload');
        if (!fileInput.files.length) { alert("Please select a PDF file to upload."); return; }
        finalUrl = URL.createObjectURL(fileInput.files[0]);
    }

    const examConfig = {
        name: currentSelectedTestType, url: finalUrl, mode: currentMode,
        timeLimitSeconds: currentMode === 'exam' ? (timeLimitMinutes * 60) : null
    };
    
    localStorage.setItem('mockos_current_exam', JSON.stringify(examConfig));
    window.location.href = "exam.html";
}
