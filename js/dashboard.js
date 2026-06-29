var currentSelectedTestType = null;
var currentSelectedUrl = null;
var currentMode = "exam";

// ==========================================
// UNIFIED CHART STATE VARIABLES
// ==========================================
let unifiedChartInstance = null;
let cachedChartResults = []; 
let currentMetricType = 'score';


// ==========================================
// UNIVERSAL COMMAND CENTER ENGINE
// ==========================================
let cachedJeeData = null; 

function openUniversalMenu() {
  const menuModal = document.getElementById("universal-menu-modal");
  if (menuModal) menuModal.classList.add("active");
  switchTab("jee");
}

function closeUniversalMenu() {
  const menuModal = document.getElementById("universal-menu-modal");
  if (menuModal) menuModal.classList.remove("active");
}

async function switchTab(targetExam) {
  document
    .querySelectorAll(".side-tab")
    .forEach((tab) => tab.classList.remove("active"));
  document.getElementById(`tab-${targetExam}`).classList.add("active");

  const contentArea = document.getElementById("modal-dynamic-content");

  if (targetExam === "jee") {
    if (!cachedJeeData) {
      contentArea.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Fetching Secure Archives...</div>`;
      try {
        const response = await fetch("papers/mains.json");
        cachedJeeData = await response.json();
      } catch (error) {
        contentArea.innerHTML = `<div style="color: #ef4444;">System Error: Failed to load archives.</div>`;
        return;
      }
    }
    renderPremiumArchive(cachedJeeData, contentArea, ["JEE Mains", "mains"]);
  } else if (targetExam === "advanced") {
    contentArea.innerHTML = `<h3 style="color: var(--text-muted);">JEE Advanced</h3><p>Archives are currently compiling...</p>`;
  } else if (targetExam === "wbjee") {
    contentArea.innerHTML = `<h3 style="color: var(--text-muted);">WBJEE Engine</h3><p>Archives are currently compiling...</p>`;
  } else if (targetExam === "others") {
    contentArea.innerHTML = `<h3 style="color: var(--text-muted);">Other Papers</h3><p>Archives are currently compiling...</p>`;
  }
}

// 3. Upgraded Render Function (macOS Finder Style)
function renderPremiumArchive(data, container, examName) {
  container.innerHTML = `
        <div class="finder-layout">
            <div class="finder-years-col" id="finder-years"></div>
            <div class="finder-shifts-col" id="finder-shifts">
                <div class="empty-state">Select a year to view secure archives.</div>
            </div>
        </div>
    `;

  const yearsCol = document.getElementById("finder-years");
  const shiftsCol = document.getElementById("finder-shifts");
  let firstYear = null;

  for (const [yearName, shifts] of Object.entries(data)) {
    if (!firstYear) firstYear = yearName;

    const yearBtn = document.createElement("button");
    yearBtn.className = "finder-year-btn";
    yearBtn.innerHTML = `<span>${yearName}</span> <span class="arrow">›</span>`;

    yearBtn.onclick = () => {
      document
        .querySelectorAll(".finder-year-btn")
        .forEach((btn) => btn.classList.remove("active"));
      yearBtn.classList.add("active");
      renderShiftsIntoColumn(yearName, shifts, shiftsCol, examName);
    };

    yearsCol.appendChild(yearBtn);
  }

  if (firstYear) {
    yearsCol.firstChild.click();
  }
}

// 3B. Helper function to render the shifts grid
function renderShiftsIntoColumn(yearName, shifts, container, examName) {
  let shiftButtonsHtml = "";

  // Safety function to prevent quotes from breaking HTML onclick attributes
  const escapeJS = (str) => str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
  const safeYearName = escapeJS(yearName);

  for (const [shiftName, Ufile] of Object.entries(shifts)) {
    const url = `/papers/pdfs/${examName[1]}/${Ufile}`;
    const safeShiftName = escapeJS(shiftName);
    const safeUrl = escapeJS(url);

    const storageKey = `score_${url}`;
    const lastScore = localStorage.getItem(storageKey);

    let scoreBadgeHtml = lastScore
      ? `<div class="paper-score-badge scored">Last Score: ${lastScore}</div>`
      : `<div class="paper-score-badge">Not Attempted</div>`;

    shiftButtonsHtml += `
            <div class="premium-shift-btn" onclick="launchTargetExam('${examName[0]}', '${safeYearName} - ${safeShiftName}', '${safeUrl}')">
                <span class="shift-name-text">${shiftName}</span>
                <div class="shift-actions">
                    ${scoreBadgeHtml}
                    <button class="download-paper-btn" onclick="downloadPaper(event, '${safeUrl}', '${safeYearName} - ${safeShiftName}')" title="Download PDF">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;
  }

  container.innerHTML = `
        <div class="shifts-header">
            <h4>${yearName} Archives</h4>
        </div>
        <div class="premium-grid fade-in-fast">${shiftButtonsHtml}</div>
    `;
}

// ==========================================
// PAPER DOWNLOAD ENGINE
// ==========================================
function downloadPaper(event, url, paperName) {
  event.stopPropagation();
  if (!url) {
    alert("Paper PDF not currently available.");
    return;
  }
  window.open(url, "_blank");
}

function launchTargetExam(examType, specificName, url) {
  closeUniversalMenu();
  openConfig(specificName, url);
}

function selectCustomUpload() {
  closeUniversalMenu();
  openConfig("Custom Upload", "local_upload");
}


// =========================================
// DYNAMIC EXAM HISTORY ENGINE
// =========================================
function getExamHistory() {
  const rawData = localStorage.getItem("mockos_results");
  if (rawData) {
    return JSON.parse(rawData);
  }
  return [
    { date: "2026-06-25", testName: "JEE Main 2025 (January) - 22 Jan Shift 1", score: 210, totalMarks: 300, accuracy: 88 },
    { date: "2026-06-24", testName: "Physics Chapter Test", score: 85, totalMarks: 100, accuracy: 90 },
    { date: "2026-06-20", testName: "WBJEE Mock 1", score: 120, totalMarks: 200, accuracy: 75 },
    { date: "2026-06-18", testName: "JEE Main 2024 - Apr 15", score: 195, totalMarks: 300, accuracy: 82 },
    { date: "2026-06-15", testName: "Chemistry Mini Mock", score: 40, totalMarks: 60, accuracy: 65 },
    { date: "2026-06-10", testName: "Maths Calculus Test", score: 90, totalMarks: 100, accuracy: 95 },
    { date: "2026-06-05", testName: "JEE Main 2023 - Mock", score: 160, totalMarks: 300, accuracy: 78 },
  ];
}

function getShortNameOfPaper(str) {
  if (!str) return "Unknown Exam";
  return str
    .trim()
    .replace(/^JEE Main\s+(\d{4})\s+\([^)]+\)\s*-\s*(.+)$/i, "$1, $2")
    .replace("Shift", "Sh");
}

function renderDashboardHistory() {
  const history = getExamHistory();
  const last5List = document.getElementById("last-5-list");
  const top5List = document.getElementById("top-5-list");

  if (!last5List || !top5List) return;

  const last5 = [...history].reverse().slice(0, 5);
  const top5 = [...history]
    .sort((a, b) => {
      let scoreA = a.overall ? a.overall.score : a.score;
      let scoreB = b.overall ? b.overall.score : b.score;
      return scoreB - scoreA;
    })
    .slice(0, 5);

  const buildLi = (item, isTop) => {
    const scoreClass = isTop ? "score top" : "score recent";
    const tName = item.testName || item.name || "Unknown Exam";
    const tScore = item.overall ? item.overall.score : item.score;
    const tAcc = String(item.accuracy).replace("%", "");

    return `<li>
                    <span class="exam-name" title="${tName}">${getShortNameOfPaper(tName)}</span>
                    <span class="${scoreClass}">${tScore} @${tAcc}%_acc</span>
                </li>`;
  };

  last5List.innerHTML = last5.length
    ? last5.map((item) => buildLi(item, false)).join("")
    : '<li><span class="exam-name" style="color:var(--text-muted)">No exams yet</span></li>';
  top5List.innerHTML = top5.length
    ? top5.map((item) => buildLi(item, true)).join("")
    : '<li><span class="exam-name" style="color:var(--text-muted)">No exams yet</span></li>';
}

function openHistoryModal() {
  const history = getExamHistory();
  const tbody = document.getElementById("full-history-tbody");

  if (tbody) {
    const fullList = [...history].reverse();

    if (fullList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted);">No history available yet. Complete a test to see it here!</td></tr>`;
    } else {
      tbody.innerHTML = fullList
        .map((item) => {
          const tName = item.testName || item.name || "Unknown Exam";
          const tScore = item.overall ? item.overall.score : item.score;
          const tAcc = String(item.accuracy).replace("%", "");
          const tTotal = item.totalMarks || 300;

          return `
                <tr style="transition: background 0.2s;" onmouseover="this.style.backgroundColor='rgba(16, 185, 129, 0.05)'" onmouseout="this.style.backgroundColor='transparent'">
                    <td style="padding: 12px 20px; border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.85rem;">${item.date}</td>
                    <td style="padding: 12px 20px; border-bottom: 1px solid var(--border-color); font-weight: 600; color: var(--text-main);">${tName}</td>
                    <td style="padding: 12px 20px; border-bottom: 1px solid var(--border-color); font-family: monospace; font-size: 1.1rem; font-weight: bold; color: var(--text-main);">${tScore}<small style="font-size:0.75rem; color:var(--text-muted); font-weight: 500;">/${tTotal}</small></td>
                    <td style="padding: 12px 20px; border-bottom: 1px solid var(--border-color); font-weight: 600; color: #10b981;">${tAcc}%</td>
                </tr>
            `;
        })
        .join("");
    }
  }
  document.getElementById("history-modal").classList.add("active");
}

function closeHistoryModal() {
  document.getElementById("history-modal").classList.remove("active");
}


// =========================================
// INITIALIZATION ON LOAD
// =========================================
document.addEventListener("DOMContentLoaded", async () => {
  renderDashboardHistory();
  generateVerticalHeatmap();
  
  // Theme Sync
  const savedTheme = localStorage.getItem("mockos_theme") || "dark";
  document.body.setAttribute("data-theme", savedTheme);
  const themeBtn = document.getElementById("theme-toggle");

  if (themeBtn) {
    themeBtn.innerText = savedTheme === "dark" ? "☀️ Switch to Light Mode" : "🌙 Switch to Dark Mode";
    
    themeBtn.addEventListener("click", () => {
      const isDark = document.body.getAttribute("data-theme") === "dark";
      const newTheme = isDark ? "light" : "dark";
      document.body.setAttribute("data-theme", newTheme);
      localStorage.setItem("mockos_theme", newTheme);
      themeBtn.innerText = newTheme === "dark" ? "☀️ Switch to Light Mode" : "🌙 Switch to Dark Mode";
      
      // Redraw chart instantly to match new theme colors
      if (unifiedChartInstance) {
        renderUnifiedChart(currentMetricType); 
      }
    });
  }

  // Load Data
  const results = JSON.parse(localStorage.getItem("mockos_results")) || [];
  loadDashboardStats(results);
  loadChart(results); 
});

function toggleMainsArchive() {
  const archive = document.getElementById("mains-archive-container");
  const card = document.getElementById("card-mains");

  if (archive.classList.contains("open")) {
    archive.classList.remove("open");
    card.classList.remove("active");
  } else {
    archive.classList.add("open");
    card.classList.add("active");
  }
}

// =========================================
// DYNAMIC STATS AGGREGATION
// =========================================
function loadDashboardStats(results) {
  if (results.length === 0) return;

  const aggregate = (examGroup) => {
    let t = {
      score: 0, att: 0, cor: 0, time: 0,
      p_s: 0, p_a: 0, p_c: 0, p_t: 0,
      c_s: 0, c_a: 0, c_c: 0, c_t: 0,
      m_s: 0, m_a: 0, m_c: 0, m_t: 0,
    };
    examGroup.forEach((res) => {
      if (res.overall && res.subjects) {
        t.score += res.overall.score;
        t.att += res.overall.attempted;
        t.cor += res.overall.correct;
        t.time += res.overall.timeTakenSeconds;
        t.p_s += res.subjects.Physics.score;
        t.p_a += res.subjects.Physics.attempted;
        t.p_c += res.subjects.Physics.correct;
        t.p_t += res.subjects.Physics.timeTakenSeconds;
        t.c_s += res.subjects.Chemistry.score;
        t.c_a += res.subjects.Chemistry.attempted;
        t.c_c += res.subjects.Chemistry.correct;
        t.c_t += res.subjects.Chemistry.timeTakenSeconds;
        t.m_s += res.subjects.Mathematics.score;
        t.m_a += res.subjects.Mathematics.attempted;
        t.m_c += res.subjects.Mathematics.correct;
        t.m_t += res.subjects.Mathematics.timeTakenSeconds;
      }
    });
    return t;
  };

  const safeDiv = (n, d) => (d > 0 ? n / d : 0);
  const safeAcc = (c, a) => (a > 0 ? Math.round((c / a) * 100) : 0);

  const cLife = results.length;
  const life = aggregate(results);
  const l10Results = results.slice(-10);
  const cL10 = l10Results.length;
  const l10 = aggregate(l10Results);

  const l10Big = `style="color: var(--primary-color); font-size: 0.7em; font-weight: 700; vertical-align: middle;"`;
  const l10Small = `style="color: var(--primary-color); font-weight: 600;"`;

  if (document.getElementById("stat-avg-score"))
    document.getElementById("stat-avg-score").innerHTML =
      `${Math.round(life.score / cLife)}<span ${l10Big}>(${Math.round(l10.score / cL10)})</span><small>/300</small>`;
  if (document.getElementById("sub-avg-score")) {
    document.getElementById("sub-avg-score").innerHTML =
      `P: ${Math.round(life.p_s / cLife)}<span ${l10Small}>(${Math.round(l10.p_s / cL10)})</span> | C: ${Math.round(life.c_s / cLife)}<span ${l10Small}>(${Math.round(l10.c_s / cL10)})</span> | M: ${Math.round(life.m_s / cLife)}<span ${l10Small}>(${Math.round(l10.m_s / cL10)})</span>`;
  }

  if (document.getElementById("stat-avg-acc"))
    document.getElementById("stat-avg-acc").innerHTML =
      `${safeAcc(life.cor, life.att)}%<span ${l10Big}>(${safeAcc(l10.cor, l10.att)}%)</span>`;
  if (document.getElementById("sub-avg-acc")) {
    document.getElementById("sub-avg-acc").innerHTML =
      `P: ${safeAcc(life.p_c, life.p_a)}%<span ${l10Small}>(${safeAcc(l10.p_c, l10.p_a)}%)</span> | C: ${safeAcc(life.c_c, life.c_a)}%<span ${l10Small}>(${safeAcc(l10.c_c, l10.c_a)}%)</span> | M: ${safeAcc(life.m_c, life.m_a)}%<span ${l10Small}>(${safeAcc(l10.m_c, l10.m_a)}%)</span>`;
  }

  if (document.getElementById("stat-avg-att"))
    document.getElementById("stat-avg-att").innerHTML =
      `${Math.round(life.att / cLife)}<span ${l10Big}>(${Math.round(l10.att / cL10)})</span><small>/75</small>`;
  if (document.getElementById("sub-avg-att")) {
    document.getElementById("sub-avg-att").innerHTML =
      `P: ${Math.round(life.p_a / cLife)}<span ${l10Small}>(${Math.round(l10.p_a / cL10)})</span> | C: ${Math.round(life.c_a / cLife)}<span ${l10Small}>(${Math.round(l10.c_a / cL10)})</span> | M: ${Math.round(life.m_a / cLife)}<span ${l10Small}>(${Math.round(l10.m_a / cL10)})</span>`;
  }

  if (document.getElementById("stat-avg-time"))
    document.getElementById("stat-avg-time").innerHTML =
      `${Math.round(safeDiv(life.time, life.att))}<span ${l10Big}>(${Math.round(safeDiv(l10.time, l10.att))})</span><small>s</small>`;
  if (document.getElementById("sub-avg-time")) {
    document.getElementById("sub-avg-time").innerHTML =
      `P: ${Math.round(safeDiv(life.p_t, life.p_a))}s<span ${l10Small}>(${Math.round(safeDiv(l10.p_t, l10.p_a))}s)</span> | C: ${Math.round(safeDiv(life.c_t, life.c_a))}s<span ${l10Small}>(${Math.round(safeDiv(l10.c_t, l10.c_a))}s)</span> | M: ${Math.round(safeDiv(life.m_t, life.m_a))}s<span ${l10Small}>(${Math.round(safeDiv(l10.m_t, l10.m_a))}s)</span>`;
  }

  if (document.getElementById("stat-total-exams"))
    document.getElementById("stat-total-exams").innerHTML =
      `${cLife}<span ${l10Big}>(${cL10})</span>`;
  if (document.getElementById("sub-total-exams"))
    document.getElementById("sub-total-exams").innerHTML =
      `Lifetime <span ${l10Small}>(Last 10)</span>`;

  const lifeAverages = [
    { n: "Physics", v: life.p_s / cLife },
    { n: "Chemistry", v: life.c_s / cLife },
    { n: "Maths", v: life.m_s / cLife },
  ].sort((a, b) => b.v - a.v);
  const l10Averages = [
    { n: "Physics", v: l10.p_s / cL10 },
    { n: "Chemistry", v: l10.c_s / cL10 },
    { n: "Maths", v: l10.m_s / cL10 },
  ].sort((a, b) => b.v - a.v);

  if (document.getElementById("stat-strong-sub"))
    document.getElementById("stat-strong-sub").innerHTML =
      `${lifeAverages[0].n}<span ${l10Big}>(${l10Averages[0].n})</span>`;
  if (document.getElementById("stat-strong-score")) {
    document.getElementById("stat-strong-score").innerHTML =
      `Avg: ${Math.round(lifeAverages[0].v)}<span ${l10Small}>(${Math.round(l10Averages[0].v)})</span>`;
  }

  if (cLife > 1) {
    const firstScore = results[0].overall ? results[0].overall.score : results[0].score;
    const lastScore = results[cLife - 1].overall ? results[cLife - 1].overall.score : results[cLife - 1].score;
    const trend = ((lastScore - firstScore) / cLife).toFixed(2);
    const sign = trend >= 0 ? "+" : "";
    if (document.getElementById("score-trend-text")) {
      document.getElementById("score-trend-text").innerHTML =
        `Score change per exam attempted: <span style="color: ${trend >= 0 ? "var(--nta-answered)" : "var(--nta-unanswered)"}">${sign}${trend} marks</span>`;
    }
  }
}


// ==========================================
// UNIFIED PERFORMANCE CHART ENGINE
// ==========================================
function loadChart(results) {
    if (results.length === 0) return;
    
    // Save the last 30 exams to memory for quick tab switching
    cachedChartResults = results.slice(-30); 
    renderUnifiedChart('score'); 
}

function switchMetric(metricName) {
    document.querySelectorAll('.metric-tab').forEach(tab => tab.classList.remove('active'));
    
    if (window.event && window.event.target) {
        window.event.target.closest('.metric-tab').classList.add('active');
    }
    
    currentMetricType = metricName;
    renderUnifiedChart(metricName);
}

function renderUnifiedChart(metric) {
    const canvas = document.getElementById("mainChart") || document.getElementById("performanceChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (unifiedChartInstance) {
        unifiedChartInstance.destroy();
    }

    const isDark = document.body.getAttribute("data-theme") === "dark";
    const gridColor = isDark ? "#27272a" : "#e5e7eb";
    const textColor = isDark ? "#a1a1aa" : "#6b7280";

    const labels = cachedChartResults.map((_, i) => `T${i + 1}`);

    const extract = (res, type) => {
        const hasNew = !!res.overall;
        let o = 0, p = 0, c = 0, m = 0;
        
        if (type === 'score') {
            o = hasNew ? res.overall.score : res.score;
            p = hasNew ? res.subjects.Physics.score : (res.physics || 0);
            c = hasNew ? res.subjects.Chemistry.score : (res.chem || 0);
            m = hasNew ? res.subjects.Mathematics.score : (res.math || 0);
        } 
        else if (type === 'accuracy') {
            const safeAcc = (cor, att) => att > 0 ? Math.round((cor / att) * 100) : 0;
            if (hasNew) {
                o = safeAcc(res.overall.correct, res.overall.attempted);
                p = safeAcc(res.subjects.Physics.correct, res.subjects.Physics.attempted);
                c = safeAcc(res.subjects.Chemistry.correct, res.subjects.Chemistry.attempted);
                m = safeAcc(res.subjects.Mathematics.correct, res.subjects.Mathematics.attempted);
            } else {
                o = res.accuracy || 0;
            }
        }
        else if (type === 'attempted') {
            if (hasNew) {
                o = res.overall.attempted;
                p = res.subjects.Physics.attempted;
                c = res.subjects.Chemistry.attempted;
                m = res.subjects.Mathematics.attempted;
            } else {
                o = res.attempted || 0;
            }
        }
        else if (type === 'time') {
            const safeTime = (sec, att) => att > 0 ? Math.round(sec / att) : 0;
            if (hasNew) {
                o = safeTime(res.overall.timeTakenSeconds, res.overall.attempted);
                p = safeTime(res.subjects.Physics.timeTakenSeconds, res.subjects.Physics.attempted);
                c = safeTime(res.subjects.Chemistry.timeTakenSeconds, res.subjects.Chemistry.attempted);
                m = safeTime(res.subjects.Mathematics.timeTakenSeconds, res.subjects.Mathematics.attempted);
            }
        }
        return { o, p, c, m };
    };

    const dataPoints = cachedChartResults.map(r => extract(r, metric));

    let yMax = undefined;
    let yLabel = "";
    if (metric === 'score') { yMax = 300; }
    if (metric === 'accuracy') { yMax = 100; yLabel = "%"; }
    if (metric === 'attempted') { yMax = 75; }

    unifiedChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `Overall ${metric.charAt(0).toUpperCase() + metric.slice(1)}`,
                    data: dataPoints.map(d => d.o),
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    order: 1 
                },
                {
                    label: 'Physics',
                    data: dataPoints.map(d => d.p),
                    borderColor: '#8b5cf6', 
                    borderWidth: 2,
                    borderDash: [5, 5], 
                    tension: 0.3,
                    order: 2
                },
                {
                    label: 'Chemistry',
                    data: dataPoints.map(d => d.c),
                    borderColor: '#10b981', 
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.3,
                    order: 3
                },
                {
                    label: 'Maths',
                    data: dataPoints.map(d => d.m),
                    borderColor: '#ef4444', 
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.3,
                    order: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            plugins: { 
                legend: { 
                    display: true, 
                    position: 'top',
                    labels: { 
                        color: textColor, 
                        usePointStyle: true, 
                        boxWidth: 8,
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',      
                    intersect: false,
                    backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
                    titleColor: isDark ? '#fff' : '#000',
                    bodyColor: isDark ? '#ccc' : '#333',
                    borderColor: gridColor,
                    borderWidth: 1
                }
            },
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: yMax,
                    grid: { color: gridColor },
                    ticks: { 
                        color: textColor,
                        callback: function(value) { return value + yLabel; }
                    }
                },
                x: { 
                    grid: { display: false }, 
                    ticks: { color: textColor } 
                }
            }
        }
    });
}


// =========================================
// CONFIGURATION MODAL & ROUTING
// =========================================
function openConfig(testName, url) {
  currentSelectedTestType = testName;
  currentSelectedUrl = url;
  document.getElementById("modal-title").innerText = `Configure: ${testName}`;

  const uploadGroup = document.getElementById("upload-group");
  uploadGroup.style.display = url === "local_upload" ? "block" : "none";

  document.getElementById("config-modal").classList.add("active");
}

function closeConfig() {
  document.getElementById("config-modal").classList.remove("active");
}

function setMode(mode) {
  currentMode = mode;
  const timerConfig = document.getElementById("timer-config");
  document.getElementById("mode-exam").classList.remove("active");
  document.getElementById("mode-practice").classList.remove("active");
  document.getElementById(`mode-${mode}`).classList.add("active");

  if (mode === "practice") {
    timerConfig.style.opacity = "0.5";
    timerConfig.style.pointerEvents = "none";
  } else {
    timerConfig.style.opacity = "1";
    timerConfig.style.pointerEvents = "all";
  }
}


// ==========================================
// HEAVY-DUTY LOCAL DATABASE (INDEXED DB)
// ==========================================
function savePdfToDatabase(fileBlob) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("MockOS_Storage", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("pdfs")) {
        db.createObjectStore("pdfs");
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction("pdfs", "readwrite");
      const store = transaction.objectStore("pdfs");
      store.put(fileBlob, "custom_test_paper");

      transaction.oncomplete = () => resolve();
      transaction.onerror = (err) => reject(err);
    };

    request.onerror = (err) => reject(err);
  });
}

function launchTest() {
  const timeLimitMinutes = document.getElementById("test-timer").value;
  let finalUrl = currentSelectedUrl;

  if (finalUrl === "local_upload") {
    const fileInput = document.getElementById("local-pdf-upload");

    if (!fileInput.files.length) {
      alert("Please select a PDF file to upload.");
      return;
    }

    const file = fileInput.files[0];

    if (file.type !== "application/pdf") {
      alert("Please upload a valid PDF document.");
      return;
    }

    savePdfToDatabase(file)
      .then(() => {
        const examConfig = {
          name: currentSelectedTestType,
          url: "DATABASE_FETCH_REQUIRED", 
          mode: currentMode,
          timeLimitSeconds: currentMode === "exam" ? timeLimitMinutes * 60 : null,
        };

        localStorage.setItem("mockos_current_exam", JSON.stringify(examConfig));
        window.location.href = "exam.html";
      })
      .catch((error) => {
        alert("System Error: Failed to allocate storage for this large PDF.");
        console.error("IndexedDB Error:", error);
      });

    return; 
  }

  const examConfig = {
    name: currentSelectedTestType,
    url: finalUrl,
    mode: currentMode,
    timeLimitSeconds: currentMode === "exam" ? timeLimitMinutes * 60 : null,
  };

  try {
    localStorage.setItem("mockos_current_exam", JSON.stringify(examConfig));
    window.location.href = "exam.html";
  } catch (error) {
    alert("An error occurred while launching the exam.");
  }
}


// ==========================================
// VERTICAL ACTIVITY HEATMAP ENGINE (REAL DATA)
// ==========================================
// ==========================================
// VERTICAL ACTIVITY HEATMAP ENGINE (REAL DATA)
// ==========================================
function generateVerticalHeatmap() {
  const grid = document.getElementById("vertical-heatmap");
  const monthsContainer = document.getElementById("heatmap-months");
  if (!grid || !monthsContainer) return;

  grid.innerHTML = "";
  monthsContainer.innerHTML = "";
  
  // 1. Fetch real test data
  const rawData = localStorage.getItem("mockos_results");
  const results = rawData ? JSON.parse(rawData) : getExamHistory();

  // 2. Create a frequency map
  const activityMap = {};
  results.forEach(res => {
      if (res.date) {
          activityMap[res.date] = (activityMap[res.date] || 0) + 1;
      }
  });

  // 3. Align the calendar to 52 weeks (Ending on the upcoming Sunday)
  const today = new Date();
  const dayOfWeek = today.getDay(); 
  const offsetToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek; 
  
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + offsetToSunday);

  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 364 + 1); 

  let lastPrintedRow = -10; // Prevents labels from overlapping if months are short

  // 4. Generate the 364 cells & Month Labels
  for (let i = 0; i < 364; i++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);

      // --- MONTH LABEL INJECTION LOGIC ---
      const rowIndex = Math.floor(i / 7);
      
      // Print if it's the 1st of the month (Or the very first cell if it's early in the month)
      if (cellDate.getDate() === 1 || (i === 0 && cellDate.getDate() < 20)) {
          // Ensure we don't print labels too close to each other
          if (rowIndex - lastPrintedRow > 2) { 
              const monthLabel = document.createElement("div");
              monthLabel.className = "month-label";
              monthLabel.innerText = cellDate.toLocaleDateString('en-US', { month: 'short' });
              
              // 16px offset per row (12px height + 4px gap)
              monthLabel.style.top = `${rowIndex * 16}px`; 
              monthsContainer.appendChild(monthLabel);
              
              lastPrintedRow = rowIndex;
          }
      }

      // --- CELL GENERATION LOGIC ---
      const year = cellDate.getFullYear();
      const month = String(cellDate.getMonth() + 1).padStart(2, '0');
      const day = String(cellDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      const isFuture = cellDate > today;
      const count = activityMap[dateString] || 0;
      let levelClass = "lvl-0";

      if (!isFuture) {
          if (count >= 4) levelClass = "lvl-4";
          else if (count === 3) levelClass = "lvl-3";
          else if (count === 2) levelClass = "lvl-2";
          else if (count === 1) levelClass = "lvl-1";
      }

      const cell = document.createElement("div");
      cell.className = `heatmap-cell ${levelClass}`;

      if (isFuture) {
          cell.style.opacity = "0.2"; 
          cell.title = "Future date";
      } else {
          const displayDate = cellDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          cell.title = count === 0 
              ? `No tests on ${displayDate}` 
              : `${count} test${count > 1 ? 's' : ''} on ${displayDate}`;
      }

      grid.appendChild(cell);
  }
}