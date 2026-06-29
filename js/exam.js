var mockTestDatabase = { questions: [], answerKey: {} };
var examState = {
  currentIndex: 0,
  userResponses: {},
  currentSubject: "Mathematics",
};
var examTimerInterval;


// --- 1. Initialization & Timer Logic ---
// --- 1. Initialization & Timer Logic ---
function startExam(generatedMap, extractedKey, config) {
  const totalQ = generatedMap.length;
  const chunkSize = Math.ceil(totalQ / 3);

  // SMART SENSING: Detect NTA pattern based on total question count!
  const examSequence =
    totalQ > 75
      ? ["Physics", "Chemistry", "Mathematics"]
      : ["Mathematics", "Physics", "Chemistry"];

  // DYNAMIC TAB REORDERING: Make the UI physically match the paper!
  const tabsContainer = document.querySelector(".subject-tabs-container");
  if (tabsContainer) {
    tabsContainer.innerHTML = ""; // Delete the hardcoded HTML tabs

    // Rebuild them in the exact order we just detected
    examSequence.forEach((subj) => {
      const btn = document.createElement("button");
      btn.className = "sub-tab";
      btn.id = `tab-${subj}`;
      // Shorten Mathematics to 'Maths' for a cleaner UI
      btn.innerText = subj === "Mathematics" ? "Maths" : subj;
      tabsContainer.appendChild(btn);
    });
  }

  // Override the parser and cleanly divide the subjects
  generatedMap.forEach((q, index) => {
    if (index < chunkSize) {
      q.subject = examSequence[0];
    } else if (index < chunkSize * 2) {
      q.subject = examSequence[1];
    } else {
      q.subject = examSequence[2];
    }
  });

  mockTestDatabase.questions = generatedMap;
  mockTestDatabase.answerKey = extractedKey;
  examState.currentIndex = 0;

  mockTestDatabase.questions.forEach((q, index) => {
    examState.userResponses[index] = {
      status: index === 0 ? "unanswered" : "unvisited",
      selectedOption: null,
      timeSpent: 0,
    };
  });

  let timeRemaining = config.mode === "exam" ? config.timeLimitSeconds : 0;
  const timeDisplay = document.getElementById("time-left");

  examTimerInterval = setInterval(() => {
    if (examState.userResponses[examState.currentIndex]) {
      examState.userResponses[examState.currentIndex].timeSpent += 1;
    }

    if (config.mode === "exam" && timeRemaining > 0) {
      timeRemaining--;
      const hours = Math.floor(timeRemaining / 3600);
      const minutes = Math.floor((timeRemaining % 3600) / 60);
      const seconds = timeRemaining % 60;
      timeDisplay.innerText = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

      if (timeRemaining <= 0) {
        clearInterval(examTimerInterval);
        alert("Time is up! Auto-submitting the exam.");
        calculateAndSubmitScore();
      }
    } else if (config.mode !== "exam") {
      timeDisplay.innerText = "Practice Mode";
    }
  }, 1000);

  // Call setupEventListeners AFTER we rebuild the tabs so they become clickable
  setupEventListeners();

  // Automatically jump to whatever subject is first in the sequence
  filterSubject(examSequence[0]);
}

// --- 2. Subject Filtering ---
// --- 2. Subject Filtering ---
// --- 2. Subject Filtering ---
function filterSubject(subjectName) {
  examState.currentSubject = subjectName;

  // Find the first question of this exact subject
  const firstQIndex = mockTestDatabase.questions.findIndex(
    (q) => q.subject === subjectName,
  );

  if (firstQIndex !== -1) {
    examState.currentIndex = firstQIndex;
  }

  const titleEl = document.getElementById("palette-title");
  if (titleEl) titleEl.innerText = `${subjectName} Section`;

  // Shift the active UI focus strictly
  document.querySelectorAll(".sub-tab, .subj-tab").forEach((tab) => {
    // Check if the tab's text matches the first 4 letters (Math, Phys, Chem)
    if (
      tab.innerText
        .toLowerCase()
        .includes(subjectName.substring(0, 4).toLowerCase())
    ) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  renderPalette();
  updateUIForCurrentQuestion();
}

// --- 3. UI Updates & Real-Time Sync ---
// --- 3. UI Updates & Real-Time Sync ---
function updateUIForCurrentQuestion() {
  const currentQ = mockTestDatabase.questions[examState.currentIndex];

  if (typeof renderAndCropQuestion === "function") {
    renderAndCropQuestion(currentQ);
  }

  const mcqContainer = document.getElementById("universal-options");
  const numericalContainer = document.getElementById("universal-numerical");
  const qTypeLabel = document.getElementById("current-q-type");

  document
    .querySelectorAll('input[name="answer"]')
    .forEach((r) => (r.checked = false));
  const numInput = document.getElementById("numerical-input");
  if (numInput) numInput.value = "";

  if (currentQ.is_numerical) {
    if (qTypeLabel)
      qTypeLabel.innerText = `Q${currentQ.question_id}: Numerical Value Type`;
    if (mcqContainer) mcqContainer.style.display = "none";
    if (numericalContainer) numericalContainer.style.display = "block";

    const savedValue =
      examState.userResponses[examState.currentIndex].selectedOption;
    if (savedValue !== null && numInput) numInput.value = savedValue;
  } else {
    if (qTypeLabel)
      qTypeLabel.innerText = `Q${currentQ.question_id}: Single Choice Type`;
    if (mcqContainer) mcqContainer.style.display = "flex";
    if (numericalContainer) numericalContainer.style.display = "none";

    const savedOption =
      examState.userResponses[examState.currentIndex].selectedOption;
    if (savedOption !== null) {
      const radio = document.querySelector(
        `input[name="answer"][value="${savedOption}"]`,
      );
      if (radio) radio.checked = true;
    }
  }

  if (examState.userResponses[examState.currentIndex].status === "unvisited") {
    examState.userResponses[examState.currentIndex].status = "unanswered";
    if (typeof updatePaletteUI === "function") updatePaletteUI();
  }
}

function handleAnswerInput(value) {
  const state = examState.userResponses[examState.currentIndex];
  const currentQ = mockTestDatabase.questions[examState.currentIndex];

  // If user is clearing the answer, always allow it
  if (value === "" || value === null) {
    state.selectedOption = null;
    state.status = "unanswered";
    updatePaletteUI();
    return;
  }

  // THE NTA LIMIT ENFORCER: Only check the limit if they are answering a NEW question
  if (state.selectedOption === null) {
    // Only enforce the 25-question limit on 90-question format papers
    if (mockTestDatabase.questions.length === 90) {
      // Count how many questions are currently answered in this subject
      let answeredInSubject = 0;
      mockTestDatabase.questions.forEach((q, idx) => {
        if (
          q.subject === currentQ.subject &&
          examState.userResponses[idx].selectedOption !== null
        ) {
          answeredInSubject++;
        }
      });

      // If they already hit 25, block the action!
      if (answeredInSubject >= 25) {
        alert(
          `NTA Rule: You can only attempt a maximum of 25 questions in the ${currentQ.subject} section. Please clear a previous response to attempt this one.`,
        );

        // Physically undo their click/typing on the screen
        const radio = document.querySelector(
          `input[name="answer"][value="${value}"]`,
        );
        if (radio) radio.checked = false;

        const numInput = document.getElementById("numerical-input");
        if (numInput) numInput.value = "";

        return; // Abort saving the answer
      }
    }
  }

  // If they passed the security check, save the answer normally
  state.selectedOption = value;

  if (state.status === "unanswered" || state.status === "unvisited") {
    state.status = "answered";
  } else if (state.status === "review") {
    state.status = "review-answered";
  }

  updatePaletteUI();
}

// --- 4. Palette Logic & LIVE COUNTERS ---
// --- 4. Palette Logic ---
function renderPalette() {
  // Perfectly targets your actual HTML ID
  const paletteContainer = document.getElementById("question-palette");
  if (!paletteContainer) return;

  paletteContainer.innerHTML = "";

  mockTestDatabase.questions.forEach((q, index) => {
    if (q.subject !== examState.currentSubject) return;

    const btn = document.createElement("button");
    btn.innerText = q.question_id;

    // Adds the 'grid-btn' class so our new CSS targets it
    btn.className = `grid-btn ${examState.userResponses[index].status}`;
    btn.id = `palette-btn-${index}`;

    btn.onclick = () => {
      examState.currentIndex = index;
      updateUIForCurrentQuestion();
    };

    paletteContainer.appendChild(btn);
  });

  // Updates the Live Counters (if you have them setup)
  if (typeof updateLegendCounts === "function") {
    updateLegendCounts();
  }
}

function updatePaletteUI() {
  const currentStatus = examState.userResponses[examState.currentIndex].status;
  const btn = document.getElementById(`palette-btn-${examState.currentIndex}`);
  if (btn) btn.className = `grid-btn ${currentStatus}`;

  // Live update the numbers instantly when button colors change
  updateLegendCounts();
}

function updateLegendCounts() {
  let counts = {
    answered: 0,
    unanswered: 0,
    unvisited: 0,
    review: 0,
    "review-answered": 0,
  };

  // Tally all questions across the entire exam
  Object.values(examState.userResponses).forEach((res) => {
    if (counts[res.status] !== undefined) counts[res.status]++;
  });

  ["answered", "unanswered", "unvisited", "review", "review-answered"].forEach(
    (id) => {
      const el = document.getElementById(`count-${id}`);
      if (el) el.innerText = counts[id];
    },
  );
}

// --- 5. Event Listeners ---
// --- 5. Event Listeners ---
function setupEventListeners() {
  const savedTheme = localStorage.getItem("mockos_theme") || "dark";
  document.body.setAttribute("data-theme", savedTheme);
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.innerText =
      savedTheme === "dark"
        ? "☀️ Switch to Light Mode"
        : "🌙 Switch to Dark Mode";
    themeBtn.addEventListener("click", () => {
      const isDark = document.body.getAttribute("data-theme") === "dark";
      const newTheme = isDark ? "light" : "dark";
      document.body.setAttribute("data-theme", newTheme);
      localStorage.setItem("mockos_theme", newTheme);
      themeBtn.innerText =
        newTheme === "dark"
          ? "☀️ Switch to Light Mode"
          : "🌙 Switch to Dark Mode";
    });
  }

  // THE CLICK FIX: Listen to every single tab button on the screen safely
  document.querySelectorAll(".sub-tab, .subj-tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {
      const text = e.target.innerText.toLowerCase();
      if (text.includes("math")) filterSubject("Mathematics");
      else if (text.includes("phys")) filterSubject("Physics");
      else if (text.includes("chem")) filterSubject("Chemistry");
    });
  });

  // Live sync for inputs
  document.querySelectorAll('input[name="answer"]').forEach((radio) => {
    radio.addEventListener("change", (e) => handleAnswerInput(e.target.value));
  });
  document
    .getElementById("numerical-input")
    ?.addEventListener("input", (e) => handleAnswerInput(e.target.value));

  // Footer Buttons
  document.getElementById("btn-save-next")?.addEventListener("click", () => {
    if (!examState.userResponses[examState.currentIndex].selectedOption) {
      examState.userResponses[examState.currentIndex].status = "unanswered";
    }
    updatePaletteUI();
    moveToNextQuestion();
  });

  document.getElementById("btn-review")?.addEventListener("click", () => {
    if (examState.userResponses[examState.currentIndex].selectedOption) {
      examState.userResponses[examState.currentIndex].status =
        "review-answered";
    } else {
      examState.userResponses[examState.currentIndex].status = "review";
    }
    updatePaletteUI();
    moveToNextQuestion();
  });

  document.getElementById("btn-clear")?.addEventListener("click", () => {
    examState.userResponses[examState.currentIndex].selectedOption = null;
    examState.userResponses[examState.currentIndex].status = "unanswered";
    updateUIForCurrentQuestion();
    updatePaletteUI();
  });

  // Submission Engine
  document.getElementById("btn-submit-exam")?.addEventListener("click", () => {
    if (
      confirm(
        "Are you sure you want to submit the exam? You cannot change your answers after this.",
      )
    ) {
      calculateAndSubmitScore();
    }
  });
}

function moveToNextQuestion() {
  let nextIndex = examState.currentIndex + 1;

  // Scan for the next question in the current subject
  while (nextIndex < mockTestDatabase.questions.length) {
    if (
      mockTestDatabase.questions[nextIndex].subject === examState.currentSubject
    ) {
      examState.currentIndex = nextIndex;
      updateUIForCurrentQuestion();
      return;
    }
    nextIndex++;
  }

  // SMART SENSING: Use the correct jump sequence based on paper size
  const sequence =
    mockTestDatabase.questions.length === 90
      ? ["Physics", "Chemistry", "Mathematics"]
      : ["Mathematics", "Physics", "Chemistry"];

  const currentSubjIndex = sequence.indexOf(examState.currentSubject);

  if (currentSubjIndex !== -1 && currentSubjIndex < 2) {
    // Jump to the next subject in the array
    filterSubject(sequence[currentSubjIndex + 1]);
  } else {
    alert(
      "You have reached the end of the exam. Please review your answers or click Submit.",
    );
  }
}

// ==========================================
// HIGH-PERFORMANCE ANALYTICS & REVIEW ENGINE
// ==========================================

let questionStartTime = Date.now();
let trackedQuestionIndex = 0;

if (typeof updateUIForCurrentQuestion === "function") {
  const originalUpdateUI = updateUIForCurrentQuestion;
  window.updateUIForCurrentQuestion = function () {
    let timeDiff = Math.floor((Date.now() - questionStartTime) / 1000);

    if (
      examState &&
      examState.userResponses &&
      examState.userResponses[trackedQuestionIndex]
    ) {
      if (
        typeof examState.userResponses[trackedQuestionIndex].timeSpent ===
        "undefined"
      ) {
        examState.userResponses[trackedQuestionIndex].timeSpent = 0;
      }
      examState.userResponses[trackedQuestionIndex].timeSpent += timeDiff;
    }

    originalUpdateUI();
    trackedQuestionIndex = examState.currentIndex;
    questionStartTime = Date.now();
  };
}

var currentAnalysisData = [];
var resultChartInstance = null;

function calculateAndSubmitScore(conf = false) {
    if (conf) {
        if (!confirm("Are you sure you want to submit the exam? You cannot change your answers after this.")) return;
    }

    if (typeof examTimerInterval !== "undefined") clearInterval(examTimerInterval);

    // Finalize time for the very last question viewed
    let finalTimeDiff = Math.floor((Date.now() - questionStartTime) / 1000);
    if (examState.userResponses[trackedQuestionIndex]) {
        examState.userResponses[trackedQuestionIndex].timeSpent = (examState.userResponses[trackedQuestionIndex].timeSpent || 0) + finalTimeDiff;
    }

    // THE NEW STRUCTURE: Deep granular tracking for the Dashboard
    let result = {
        overall: { score: 0, correct: 0, incorrect: 0, attempted: 0, timeTakenSeconds: 0 },
        subjects: {
            Physics: { score: 0, correct: 0, incorrect: 0, attempted: 0, timeTakenSeconds: 0 },
            Chemistry: { score: 0, correct: 0, incorrect: 0, attempted: 0, timeTakenSeconds: 0 },
            Mathematics: { score: 0, correct: 0, incorrect: 0, attempted: 0, timeTakenSeconds: 0 },
        },
    };
    currentAnalysisData = [];

    mockTestDatabase.questions.forEach((q, index) => {
        let userAns = examState.userResponses[index].selectedOption;
        let realAns = mockTestDatabase.answerKey[q.question_id];
        let subj = q.subject;
        let timeTaken = examState.userResponses[index].timeSpent || 0;

        let status = "unanswered";
        let earned = 0;

        // Add time to both overall and specific subject
        result.overall.timeTakenSeconds += timeTaken;
        if (result.subjects[subj]) result.subjects[subj].timeTakenSeconds += timeTaken;

        if (userAns !== null && userAns !== undefined && userAns !== "") {
            result.overall.attempted++;
            if (result.subjects[subj]) result.subjects[subj].attempted++;

            if (realAns === "Bonus" || String(userAns).trim() === String(realAns).trim()) {
                result.overall.score += 4;
                result.overall.correct++;
                if (result.subjects[subj]) {
                    result.subjects[subj].score += 4;
                    result.subjects[subj].correct++;
                }
                status = "correct";
                earned = 4;
            } else {
                result.overall.score -= 1;
                result.overall.incorrect++;
                if (result.subjects[subj]) {
                    result.subjects[subj].score -= 1;
                    result.subjects[subj].incorrect++;
                }
                status = "incorrect";
                earned = -1;
            }
        }

        currentAnalysisData.push({
            qNum: q.question_id,
            subject: subj,
            time: timeTaken,
            user: userAns || "--",
            real: realAns || "--",
            status: status,
            originalIndex: index,
        });
    });

    const configData = JSON.parse(localStorage.getItem("mockos_current_exam")) || {};
    let pastResults = JSON.parse(localStorage.getItem("mockos_results")) || [];

    // Calculate Trend for Modal
    let compText = "First Test!";
    let compClass = "up";
    if (pastResults.length > 0) {
        let avgPast = pastResults.reduce((sum, r) => sum + (r.overall ? r.overall.score : r.score), 0) / pastResults.length;
        let diff = Math.round(result.overall.score - avgPast);
        if (diff >= 0) {
            compText = `+${diff} from Avg`;
            compClass = "up";
        } else {
            compText = `${diff} from Avg`;
            compClass = "down";
        }
    }

    const accuracy = result.overall.attempted > 0 ? Math.round((result.overall.correct / result.overall.attempted) * 100) : 0;

    // Save the deep structure to localStorage
    pastResults.push({
        testName: configData.name || "Custom Test",
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
        overall: result.overall,
        subjects: result.subjects,
        // Fallbacks for older dashboard code until it updates
        score: result.overall.score, 
        accuracy: accuracy, 
        attempted: result.overall.attempted
    });
    localStorage.setItem("mockos_results", JSON.stringify(pastResults));
    localStorage.setItem(`score_${configData.url}`, JSON.stringify(result.overall.score));

    // Update Result Modal
    document.getElementById("res-score").innerHTML = `${result.overall.score}<small>/300</small>`;
    document.getElementById("res-acc").innerText = `${accuracy}%`;
    document.getElementById("res-att").innerHTML = `${result.overall.attempted}<small>/75</small>`;

    const compEl = document.getElementById("res-comparison");
    if(compEl) {
        compEl.innerText = compText;
        compEl.className = `res-compare ${compClass}`;
    }

    renderSubjectChart("Mathematics");
    renderAnalysisTable("all");
    document.getElementById("result-modal").classList.add("active");
}

function renderSubjectChart(subject) {
  document
    .querySelectorAll(".chart-pill")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelector(`.chart-pill[onclick="renderSubjectChart('${subject}')"]`)
    .classList.add("active");

  const ctx = document.getElementById("resultChart");
  if (resultChartInstance) resultChartInstance.destroy();

  const isDark = document.body.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#a1a1aa" : "#6b7280";
  const gridColor = isDark ? "#27272a" : "#e5e7eb";

  const subjectData = currentAnalysisData.filter((q) => q.subject === subject);

  const labels = subjectData.map((q) => `Q${q.qNum}`);
  const timeData = subjectData.map((q) => q.time);

  const bgColors = subjectData.map((q) => {
    if (q.status === "correct") return "rgba(16, 185, 129, 0.9)";
    if (q.status === "incorrect") return "rgba(239, 68, 68, 0.9)";
    return "rgba(107, 114, 128, 0.4)";
  });

  resultChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: `Time Taken (s)`,
          data: timeData,
          backgroundColor: bgColors,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              return ` Time: ${Math.floor(context.raw / 60)}m ${context.raw % 60}s`;
            },
          },
        },
      },
      scales: {
        y: {
          title: { display: true, text: "Time Taken (s)", color: textColor },
          grid: { color: gridColor },
          ticks: { color: textColor },
        },
        x: {
          grid: { display: false },
          ticks: { color: textColor, maxRotation: 0, font: { size: 10 } },
        },
      },
    },
  });
}

function renderAnalysisTable(filter) {
  const tbody = document.getElementById("analysis-tbody");
  tbody.innerHTML = "";
  document
    .querySelectorAll(".filter-btn")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelector(`.filter-btn[onclick="filterAnalysis('${filter}')"]`)
    .classList.add("active");

  currentAnalysisData.forEach((row) => {
    if (filter === "incorrect" && row.status !== "incorrect") return;
    if (filter === "correct" && row.status !== "correct") return;
    if (filter === "overtime" && row.time <= 120) return;

    let timeStr =
      row.time > 120
        ? `${Math.floor(row.time / 60)}m ${row.time % 60}s`
        : `${row.time}s`;
    let timeClass = row.time > 120 ? "time-warning" : "";
    let badgeClass =
      row.status === "correct"
        ? "correct"
        : row.status === "incorrect"
          ? "incorrect"
          : "unanswered";
    let statusText =
      row.status === "correct" ? "+4" : row.status === "incorrect" ? "-1" : "0";

    tbody.innerHTML += `<tr>
            <td>Q${row.qNum}</td><td>${row.subject.substring(0, 4)}</td><td class="${timeClass}">${timeStr}</td>
            <td style="font-family: monospace;">${row.user}</td><td style="font-family: monospace; color: var(--primary-color);">${row.real}</td>
            <td><span class="badge-status ${badgeClass}">${statusText}</span></td>
            <td><button class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="openReviewModal(${row.originalIndex})">Review 👁️</button></td>
        </tr>`;
  });
}

function filterAnalysis(type) {
  renderAnalysisTable(type);
}
function switchResultTab(tabName) {
  document
    .querySelectorAll(".res-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".res-tab-content")
    .forEach((c) => (c.style.display = "none"));
  document
    .querySelector(`.res-tab[onclick="switchResultTab('${tabName}')"]`)
    .classList.add("active");
  document.getElementById(`tab-${tabName}`).style.display = "block";
}

// Function to calculate and inject the live NTA counts
// Function to safely calculate and inject live NTA counts
function updateLegendCounts() {
  let counts = {
    answered: 0,
    unanswered: 0,
    unvisited: 0,
    review: 0,
    "review-answered": 0,
  };

  // Tally up the exact status of all questions
  if (examState && examState.userResponses) {
    Object.values(examState.userResponses).forEach((res) => {
      if (counts[res.status] !== undefined) counts[res.status]++;
    });
  }

  // Inject numbers safely into the SPAN, preserving any CSS checkmarks in the parent div!
  ["answered", "unanswered", "unvisited", "review", "review-answered"].forEach(
    (id) => {
      const spanEl = document.getElementById(`count-${id}`);
      if (spanEl) spanEl.innerText = counts[id];
    },
  );
}

function openReviewModal(qIndex) {
  const qData = mockTestDatabase.questions[qIndex];
  const userState = examState.userResponses[qIndex];
  const realAns = mockTestDatabase.answerKey[qData.question_id];

  document.getElementById("review-q-title").innerText =
    `Mistake Analyzer: Q${qData.question_id} (${qData.subject})`;

  let timeStr =
    (userState.timeSpent || 0) > 120
      ? `${Math.floor(userState.timeSpent / 60)}m ${userState.timeSpent % 60}s`
      : `${userState.timeSpent || 0}s`;

  let badgeClass = "Unanswered";
  if (userState.status.includes("answered")) {
    badgeClass =
      String(userState.selectedOption).trim() === String(realAns).trim() ||
      realAns === "Bonus"
        ? "Correct"
        : "Incorrect";
  }

  document.getElementById("review-q-stats").innerText =
    `Time Taken: ${timeStr} | Status: ${badgeClass}`;
  document.getElementById("rev-user-ans").innerText =
    userState.selectedOption || "Blank";
  document.getElementById("rev-real-ans").innerText = realAns || "Bonus";

  const canvasContainer = document.getElementById("review-q-canvas");
  canvasContainer.innerHTML =
    "<p style='color: var(--text-muted); padding: 20px; font-weight: bold;'>Rendering Final Image...</p>";

  document.getElementById("review-modal").classList.add("active");

  if (typeof updateUIForCurrentQuestion === "function") {
    const originalIndex = examState.currentIndex;
    examState.currentIndex = qIndex;
    updateUIForCurrentQuestion(); // Render the target question in the background

    setTimeout(() => {
      const sourceCanvas = document.querySelector(
        "main canvas:not(#resultChart)",
      );
      canvasContainer.innerHTML = "";

      if (sourceCanvas) {
        try {
          // 1. Find the CSS wrapper doing the cropping in the main UI
          let cropWindow = sourceCanvas;
          let parent = sourceCanvas.parentElement;
          while (
            parent &&
            parent.tagName !== "BODY" &&
            parent.tagName !== "MAIN"
          ) {
            const style = window.getComputedStyle(parent);
            if (
              style.overflow === "hidden" ||
              style.overflowY === "hidden" ||
              style.maxHeight !== "none" ||
              parseFloat(style.height) < sourceCanvas.height
            ) {
              cropWindow = parent;
              break;
            }
            parent = parent.parentElement;
          }

          // 2. Clone the wrapper and ALL its CSS classes
          let finalElement;

          if (cropWindow === sourceCanvas) {
            // Safe fallback if no wrapper exists
            const img = document.createElement("img");
            img.src = sourceCanvas.toDataURL("image/png");
            img.style.cssText = sourceCanvas.style.cssText;
            img.style.width = "100%";
            img.style.height = "auto";
            img.style.display = "block";

            finalElement = document.createElement("div");
            finalElement.appendChild(img);
          } else {
            // Clone the HTML wrapper
            finalElement = cropWindow.cloneNode(true);
            finalElement.id = ""; // Strip IDs so we don't break the main UI
            finalElement.querySelectorAll("*").forEach((el) => (el.id = ""));

            // Lock the dimensions to mathematically match the screen
            const rect = cropWindow.getBoundingClientRect();
            finalElement.style.width = rect.width + "px";
            finalElement.style.height = rect.height + "px";
            finalElement.style.margin = "0 auto";
            finalElement.style.position = "relative";
            finalElement.style.backgroundColor = "white";
            finalElement.style.borderRadius = "6px";
            finalElement.style.overflow = "hidden"; // Enforce the visual crop!

            // 3. Swap out the blank clone canvas for the real photograph!
            const clonedCanvasList = finalElement.querySelectorAll("canvas");
            const originalCanvasList = cropWindow.querySelectorAll("canvas");

            for (let i = 0; i < clonedCanvasList.length; i++) {
              const cCanvas = clonedCanvasList[i];
              const oCanvas = originalCanvasList[i];

              const img = document.createElement("img");

              // Take the actual Base64 photograph
              if (oCanvas.width > 0 && oCanvas.height > 0) {
                img.src = oCanvas.toDataURL("image/png");
              }

              // Copy the exact positioning (margins, shifts) from the main screen
              img.style.cssText = oCanvas.style.cssText;
              img.className = oCanvas.className;

              // Inject the photo into the wrapper
              cCanvas.parentNode.replaceChild(img, cCanvas);
            }
          }

          // 4. Wrap everything in a nice scrollable box for the modal
          const modalWrapper = document.createElement("div");
          modalWrapper.style.width = "100%";
          modalWrapper.style.maxHeight = "350px";
          modalWrapper.style.overflowY = "auto";
          modalWrapper.style.overflowX = "auto";
          modalWrapper.style.backgroundColor = "white";
          modalWrapper.style.borderRadius = "6px";
          modalWrapper.appendChild(finalElement);

          canvasContainer.appendChild(modalWrapper);
        } catch (err) {
          canvasContainer.innerHTML = `<p style='color: #ef4444; padding: 20px;'>Snapshot failed: ${err.message}</p>`;
        }
      } else {
        canvasContainer.innerHTML =
          "<p style='color: #ef4444; padding: 20px;'>Error: Could not locate the image.</p>";
      }

      // Jump the user seamlessly back
      examState.currentIndex = originalIndex;
      updateUIForCurrentQuestion();
    }, 600);
  }
}

// Function to close the Mistake Analyzer
function closeReviewModal() {
  const modal = document.getElementById("review-modal");
  if (modal) {
    modal.classList.remove("active");
  }
}
