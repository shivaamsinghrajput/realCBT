var mockTestDatabase = { questions: [], answerKey: {} };
var examState = { currentIndex: 0, userResponses: {}, currentSubject: 'Physics' };
var examTimerInterval;

// --- 1. Initialization (Timer Starts HERE) ---
function startExam(generatedMap, extractedKey, config) {
    mockTestDatabase.questions = generatedMap;
    mockTestDatabase.answerKey = extractedKey;
    examState.currentIndex = 0;
    
    // Initialize user responses
    mockTestDatabase.questions.forEach((q, index) => {
        examState.userResponses[index] = { status: index === 0 ? 'unanswered' : 'unvisited', selectedOption: null };
    });

    // Start Timer safely after load
    if (config.mode === 'exam' && config.timeLimitSeconds) {
        let timeRemaining = config.timeLimitSeconds;
        const timeDisplay = document.getElementById('time-left');

        examTimerInterval = setInterval(() => {
            timeRemaining--;
            const hours = Math.floor(timeRemaining / 3600);
            const minutes = Math.floor((timeRemaining % 3600) / 60);
            const seconds = timeRemaining % 60;
            
            timeDisplay.innerText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (timeRemaining <= 0) {
                clearInterval(examTimerInterval);
                alert("Time is up! Auto-submitting the exam.");
                // Auto-grade logic goes here
            }
        }, 1000);
    } else {
        document.getElementById('time-left').innerText = "Practice Mode";
    }

    setupEventListeners();
    filterSubject('Physics'); // Renders initial palette and UI
}

// --- 2. Subject Filtering ---
function filterSubject(subject) {
    examState.currentSubject = subject;
    document.getElementById('palette-title').innerText = `${subject} Section`;

    // Update active tab UI
    document.querySelectorAll('.sub-tab').forEach(tab => {
        tab.classList.toggle('active', tab.innerText.includes(subject) || tab.id === `tab-${subject}`);
    });

    // Find the first question of this subject and jump to it
    const firstQIndex = mockTestDatabase.questions.findIndex(q => q.subject === subject);
    if (firstQIndex !== -1) {
        examState.currentIndex = firstQIndex;
    }

    renderPalette();
    updateUIForCurrentQuestion();
}

// --- 3. UI Updates & Real-Time Sync ---
function updateUIForCurrentQuestion() {
    const currentQ = mockTestDatabase.questions[examState.currentIndex];
    
    // Trigger the parser's image stitcher
    if (typeof renderAndCropQuestion === "function") {
        renderAndCropQuestion(currentQ);
    }
    
    document.getElementById('subject-name').innerText = `Subject: ${currentQ.subject}`;
    
    const mcqContainer = document.getElementById('universal-options');
    const numericalContainer = document.getElementById('universal-numerical');
    const qTypeLabel = document.getElementById('current-q-type');

    // Reset all inputs visually first
    document.querySelectorAll('input[name="answer"]').forEach(r => r.checked = false);
    document.getElementById('numerical-input').value = '';

    if (currentQ.is_numerical) {
        qTypeLabel.innerText = `Q${currentQ.question_id}: Numerical Value Type`;
        mcqContainer.style.display = 'none';
        numericalContainer.style.display = 'block';

        const savedValue = examState.userResponses[examState.currentIndex].selectedOption;
        if (savedValue !== null) document.getElementById('numerical-input').value = savedValue;
    } else {
        qTypeLabel.innerText = `Q${currentQ.question_id}: Single Choice Type`;
        mcqContainer.style.display = 'flex';
        numericalContainer.style.display = 'none';

        const savedOption = examState.userResponses[examState.currentIndex].selectedOption;
        if (savedOption !== null) {
            const radio = document.querySelector(`input[name="answer"][value="${savedOption}"]`);
            if (radio) radio.checked = true;
        }
    }

    // Mark as visited if not answered yet
    if (examState.userResponses[examState.currentIndex].status === 'unvisited') {
        examState.userResponses[examState.currentIndex].status = 'unanswered';
        updatePaletteUI();
    }
}

// Automatically sync user clicks to the palette logic
function handleAnswerInput(value) {
    const state = examState.userResponses[examState.currentIndex];
    state.selectedOption = value;
    
    if (value === "") {
        state.status = 'unanswered'; // If they delete a numerical answer
    } else {
        if (state.status === 'unanswered' || state.status === 'unvisited') {
            state.status = 'answered'; // Turns Green
        } else if (state.status === 'review') {
            state.status = 'review-answered'; // Turns Purple with Green tick
        }
    }
    updatePaletteUI();
}

// --- 4. Palette Logic ---
function renderPalette() {
    const paletteContainer = document.getElementById('question-palette');
    paletteContainer.innerHTML = ""; 

    mockTestDatabase.questions.forEach((q, index) => {
        // Only render buttons for the currently selected subject tab
        if (q.subject !== examState.currentSubject) return;

        const btn = document.createElement('button');
        btn.innerText = q.question_id;
        btn.className = `grid-btn ${examState.userResponses[index].status}`;
        btn.id = `palette-btn-${index}`;
        
        btn.onclick = () => {
            examState.currentIndex = index;
            updateUIForCurrentQuestion();
        };
        
        paletteContainer.appendChild(btn);
    });
}

function updatePaletteUI() {
    const currentStatus = examState.userResponses[examState.currentIndex].status;
    const btn = document.getElementById(`palette-btn-${examState.currentIndex}`);
    if (btn) {
        btn.className = `grid-btn ${currentStatus}`;
    }
}

// --- 5. Event Listeners ---
// --- 5. Event Listeners & Core Logic ---
function setupEventListeners() {
    // Synchronize Theme from Dashboard
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
        });
    }

    // Subject Tabs
    document.getElementById('tab-Physics').addEventListener('click', () => filterSubject('Physics'));
    document.getElementById('tab-Chemistry').addEventListener('click', () => filterSubject('Chemistry'));
    document.getElementById('tab-Mathematics').addEventListener('click', () => filterSubject('Mathematics'));

    // Live sync for inputs
    document.querySelectorAll('input[name="answer"]').forEach(radio => {
        radio.addEventListener('change', (e) => handleAnswerInput(e.target.value));
    });
    document.getElementById('numerical-input').addEventListener('input', (e) => handleAnswerInput(e.target.value));

    // Footer Buttons
    document.getElementById('btn-save-next').addEventListener('click', () => {
        if (!examState.userResponses[examState.currentIndex].selectedOption) {
            examState.userResponses[examState.currentIndex].status = 'unanswered';
        }
        updatePaletteUI();
        moveToNextQuestion();
    });

    document.getElementById('btn-review').addEventListener('click', () => {
        if (examState.userResponses[examState.currentIndex].selectedOption) {
            examState.userResponses[examState.currentIndex].status = 'review-answered';
        } else {
            examState.userResponses[examState.currentIndex].status = 'review';
        }
        updatePaletteUI();
        moveToNextQuestion();
    });

    document.getElementById('btn-clear').addEventListener('click', () => {
        examState.userResponses[examState.currentIndex].selectedOption = null;
        examState.userResponses[examState.currentIndex].status = 'unanswered';
        updateUIForCurrentQuestion(); 
        updatePaletteUI();
    });

    // Submission Engine
    document.getElementById('btn-submit-exam').addEventListener('click', () => {
        if (confirm("Are you sure you want to submit the exam? You cannot change your answers after this.")) {
            calculateAndSubmitScore();
        }
    });
}

function moveToNextQuestion() {
    let nextIndex = examState.currentIndex + 1;
    
    // Scan for the next question in the current subject
    while (nextIndex < mockTestDatabase.questions.length) {
        if (mockTestDatabase.questions[nextIndex].subject === examState.currentSubject) {
            examState.currentIndex = nextIndex;
            updateUIForCurrentQuestion();
            return;
        }
        nextIndex++;
    }

    // FIX: If we reach the end of the subject, jump to the next subject automatically
    const subjects = ['Physics', 'Chemistry', 'Mathematics'];
    const currentSubjIndex = subjects.indexOf(examState.currentSubject);
    
    if (currentSubjIndex < 2) {
        filterSubject(subjects[currentSubjIndex + 1]);
    } else {
        alert("You have reached the end of the exam. Please review your answers or Submit.");
    }
}

// --- 6. The Auto-Grader Engine ---
function calculateAndSubmitScore() {
    if (examTimerInterval) clearInterval(examTimerInterval);

    let result = {
        total: 0, correct: 0, incorrect: 0, attempted: 0,
        subjects: {
            Physics: { score: 0 },
            Chemistry: { score: 0 },
            Mathematics: { score: 0 }
        }
    };

    mockTestDatabase.questions.forEach((q, index) => {
        let userAns = examState.userResponses[index].selectedOption;
        let realAns = mockTestDatabase.answerKey[q.question_id];
        let subj = q.subject;

        if (userAns !== null && userAns !== undefined && userAns !== "") {
            result.attempted++;
            // Check against MathonGo's key (Handling "Bonus" or exact matches)
            if (realAns === "Bonus" || String(userAns).trim() === String(realAns).trim()) {
                result.total += 4;
                result.correct++;
                result.subjects[subj].score += 4;
            } else {
                result.total -= 1;
                result.incorrect++;
                result.subjects[subj].score -= 1;
            }
        }
    });

    // Save to Database
    const configData = JSON.parse(localStorage.getItem('mockos_current_exam'));
    let pastResults = JSON.parse(localStorage.getItem('mockos_results')) || [];
    
    const accuracy = result.attempted > 0 ? Math.round((result.correct / result.attempted) * 100) : 0;

    pastResults.push({
        testName: configData.name || "Custom Test",
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
        score: result.total,
        accuracy: accuracy,
        physics: result.subjects.Physics.score,
        chem: result.subjects.Chemistry.score,
        math: result.subjects.Mathematics.score
    });

    localStorage.setItem('mockos_results', JSON.stringify(pastResults));

    // Display Result Overlay
    document.getElementById('res-score').innerHTML = `${result.total}<small style="font-size: 1rem; color: var(--text-muted);">/300</small>`;
    document.getElementById('res-acc').innerText = `${accuracy}%`;
    document.getElementById('res-att').innerHTML = `${result.attempted}<small style="font-size: 1rem; color: var(--text-muted);">/75</small>`;
    
    document.getElementById('res-phy').innerText = `Physics: ${result.subjects.Physics.score}`;
    document.getElementById('res-chem').innerText = `Chemistry: ${result.subjects.Chemistry.score}`;
    document.getElementById('res-math').innerText = `Maths: ${result.subjects.Mathematics.score}`;

    document.getElementById('result-modal').classList.add('active');
}
