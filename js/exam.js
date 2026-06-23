// --- 1. State Management ---
// Holds the 75 dummy questions and tracks the user's answers
const examState = {
    questions: [],      
    currentIndex: 0,    
    userResponses: {}   
};

// --- 2. Initialization ---
// Called by parser.js once the PDF is loaded
function startExam(parsedData) {
    examState.questions = parsedData;
    examState.currentIndex = 0;
    
    // Set all 75 questions to 'unvisited' initially
    parsedData.forEach((_, index) => {
        if (index === 0) {
            examState.userResponses[index] = { status: 'unanswered', selectedOption: null };
        } else {
            examState.userResponses[index] = { status: 'unvisited', selectedOption: null };
        }
    });

    renderPalette();
    updateUIForCurrentQuestion();
}

// --- 3. UI Updates (The New Method) ---
// We no longer inject text. We only update the Answer Pad and Palette.

function updateUIForCurrentQuestion() {
    const currentQ = examState.questions[examState.currentIndex];
    
    // --- NEW: Trigger the cropper for this specific question ---
    if (typeof renderAndCropQuestion === "function") {
        renderAndCropQuestion(currentQ);
    }
    // Update Subject Info in the Right Panel
    document.getElementById('subject-name').innerText = `Subject: ${currentQ.subject}`;
    
    // Grab the Answer Pad elements
    const mcqContainer = document.getElementById('universal-options');
    const numericalContainer = document.getElementById('universal-numerical');
    const qTypeLabel = document.getElementById('current-q-type');

    // Toggle between MCQ (Radio Buttons) and Numerical (Input Box)
    if (currentQ.is_numerical) {
        qTypeLabel.innerText = `Q${examState.currentIndex + 1}: Numerical Value Type`;
        mcqContainer.style.display = 'none';
        numericalContainer.style.display = 'block';

        // Restore typed answer if the user comes back to this question
        const savedValue = examState.userResponses[examState.currentIndex].selectedOption;
        document.getElementById('numerical-input').value = savedValue !== null ? savedValue : '';
    } else {
        qTypeLabel.innerText = `Q${examState.currentIndex + 1}: Single Choice Type`;
        mcqContainer.style.display = 'flex';
        numericalContainer.style.display = 'none';

        // Restore the filled radio button if the user comes back to this question
        const savedOption = examState.userResponses[examState.currentIndex].selectedOption;
        const radios = document.querySelectorAll('input[name="answer"]');
        radios.forEach(radio => {
            radio.checked = (radio.value === savedOption);
        });
    }

    // If it was 'unvisited', it is now 'unanswered' because they are looking at it
    if (examState.userResponses[examState.currentIndex].status === 'unvisited') {
        examState.userResponses[examState.currentIndex].status = 'unanswered';
        updatePaletteUI();
    }
}

// --- 4. Rendering the Grid Palette ---
function renderPalette() {
    const paletteContainer = document.getElementById('question-palette');
    paletteContainer.innerHTML = ""; 

    examState.questions.forEach((_, index) => {
        const btn = document.createElement('button');
        btn.innerText = index + 1;
        btn.className = `grid-btn ${examState.userResponses[index].status}`;
        btn.id = `palette-btn-${index}`;
        
        // Clicking a palette button jumps straight to that question
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

// --- 5. Event Listeners for Answer Pad & Footer ---
document.addEventListener('DOMContentLoaded', () => {
    
    // Listen for MCQ Radio Button Clicks
    const radios = document.querySelectorAll('input[name="answer"]');
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            examState.userResponses[examState.currentIndex].selectedOption = e.target.value;
        });
    });

    // Listen for Numerical Input Typing
    const numInput = document.getElementById('numerical-input');
    if (numInput) {
        numInput.addEventListener('input', (e) => {
            examState.userResponses[examState.currentIndex].selectedOption = e.target.value;
        });
    }

    // --- Footer Actions ---
    document.getElementById('btn-save-next').addEventListener('click', () => {
        if (examState.userResponses[examState.currentIndex].selectedOption) {
            examState.userResponses[examState.currentIndex].status = 'answered';
        } else {
            examState.userResponses[examState.currentIndex].status = 'unanswered';
        }
        
        updatePaletteUI();
        
        if (examState.currentIndex < examState.questions.length - 1) {
            examState.currentIndex++;
            updateUIForCurrentQuestion();
        }
    });

    document.getElementById('btn-review').addEventListener('click', () => {
        examState.userResponses[examState.currentIndex].status = 'review';
        updatePaletteUI();
        
        if (examState.currentIndex < examState.questions.length - 1) {
            examState.currentIndex++;
            updateUIForCurrentQuestion();
        }
    });

    document.getElementById('btn-clear').addEventListener('click', () => {
        examState.userResponses[examState.currentIndex].selectedOption = null;
        examState.userResponses[examState.currentIndex].status = 'unanswered';
        updatePaletteUI();
        updateUIForCurrentQuestion(); 
    });
});