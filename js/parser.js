// --- 1. Initialize the PDF.js Web Worker ---
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let currentPDF = null;
let currentRenderedPageNum = null; 

// --- 2. The Auto-Scanner: Hunts for Question Numbers ---
// --- 2. The MathonGo-Specific Auto-Scanner ---
// --- 2. The Multi-Slice Auto-Scanner ---
// --- 2. The Multi-Slice Auto-Scanner ---
async function autoGenerateExamMap(pdf) {
    document.querySelector('.exam-title').innerText = "Scanning MathonGo Paper...";
    const examMap = [];
    let expectedQuestion = 1;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 2.0 });

        for (let i = 0; i < textContent.items.length; i++) {
            const item = textContent.items[i];
            const text = item.str.trim();

            const match = text.match(/^Q(\d+)\./);
            
            if (match) {
                const foundNumber = parseInt(match[1]);

                if (foundNumber === expectedQuestion) {
                    const pdfY = item.transform[5]; 
                    const canvasCoords = viewport.convertToViewportPoint(0, pdfY);
                    
                    if (expectedQuestion > 1) {
                        const prevQ = examMap[expectedQuestion - 2];
                        const lastSlice = prevQ.slices[prevQ.slices.length - 1];
                        
                        if (lastSlice.page === pageNum) {
                            lastSlice.endY = canvasCoords[1] - 40; 
                        } else {
                            // Close off the slice on the older page
                            const oldPage = await pdf.getPage(lastSlice.page);
                            const oldViewport = oldPage.getViewport({ scale: 2.0 });
                            lastSlice.endY = oldViewport.height - 80;

                            // 🚨 FIX 1: Increased from 80 to 125 to completely bypass the MathonGo header
                            prevQ.slices.push({
                                page: pageNum,
                                startY: 125, 
                                endY: canvasCoords[1] - 40 
                            });
                        }
                    }

                    examMap.push({
                        question_id: expectedQuestion,
                        subject: determineSubject(expectedQuestion),
                        is_numerical: (expectedQuestion % 25 > 20) || (expectedQuestion % 25 === 0),
                        slices: [ { page: pageNum, startY: canvasCoords[1] - 30, endY: null } ]
                    });

                    expectedQuestion++;
                }
            }
        }
    }

    if (examMap.length > 0) {
        const lastQ = examMap[examMap.length - 1];
        const lastSlice = lastQ.slices[lastQ.slices.length - 1];
        const lastPage = await pdf.getPage(lastSlice.page);
        const lastViewport = lastPage.getViewport({ scale: 2.0 });
        lastSlice.endY = lastViewport.height - 80;
    }

    console.log("Successfully Mapped with Stitching");
    return examMap;
}

// --- 3. The Multi-Slice Render Engine ---
// --- 3. The Multi-Slice Render Engine ---
async function renderAndCropQuestion(questionData) {
    if (!currentPDF || !questionData.slices) return;

    const hiddenCanvas = document.getElementById('hidden-pdf-canvas');
    const container = document.getElementById('pdf-container');
    
    container.style.display = 'block'; 
    container.style.textAlign = 'center';

    const oldSlices = container.querySelectorAll('.visible-slice');
    oldSlices.forEach(slice => slice.remove());

    for (const slice of questionData.slices) {
        
        if (currentRenderedPageNum !== slice.page) {
            const page = await currentPDF.getPage(slice.page);
            const viewport = page.getViewport({ scale: 2.0 }); 
            
            hiddenCanvas.height = viewport.height;
            hiddenCanvas.width = viewport.width;
            
            const context = hiddenCanvas.getContext('2d', { willReadFrequently: true });
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            currentRenderedPageNum = slice.page;
        }

        const sourceX = 0; 
        const sourceY = slice.startY;
        const sourceWidth = hiddenCanvas.width; 
        const sourceHeight = slice.endY - slice.startY;

        if (sourceHeight <= 0) continue;

        // Create a brand new canvas for this specific slice
        const visCanvas = document.createElement('canvas');
        visCanvas.className = 'visible-slice';
        
        // Let CSS handle the positioning naturally
        visCanvas.style.display = 'block';
        visCanvas.style.marginBottom = '5px'; 
        visCanvas.style.maxWidth = '100%'; 
        // Removed background-color, box-shadow, and margin: 0 auto;
        
        visCanvas.width = sourceWidth;
        visCanvas.height = sourceHeight;
        
        const visContext = visCanvas.getContext('2d', { willReadFrequently: true });
        visContext.drawImage(
            hiddenCanvas, 
            sourceX, sourceY, sourceWidth, sourceHeight, 
            0, 0, sourceWidth, sourceHeight              
        );

        // 🚨 FIX 2: Run the Whitespace Trimmer before showing it to the user
        trimCanvasBottom(visCanvas);

        container.appendChild(visCanvas);
    }
}

// --- 4. The Whitespace Trimmer (Computer Vision) ---
function trimCanvasBottom(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Grab the raw pixel data of the image
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let bottomY = height;

    // Scan pixel rows from the BOTTOM to the TOP
    for (let y = height - 1; y >= 0; y--) {
        let rowHasContent = false;
        
        // Scan across the row (Left to Right)
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const a = data[index + 3];

            // Pure white is 255,255,255. 
            // If we find a pixel darker than 245, it is text/content!
            if (a > 0 && (r < 245 || g < 245 || b < 245)) {
                rowHasContent = true;
                break;
            }
        }
        
        if (rowHasContent) {
            bottomY = y;
            break; // Stop scanning once we hit the bottom of the text
        }
    }

    // Add 20 pixels of comfortable padding below the text
    const padding = 20; 
    const newHeight = Math.min(height, bottomY + padding);

    // If we found empty space, dynamically cut the canvas height
    if (newHeight < height) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = newHeight;
        tempCanvas.getContext('2d').drawImage(canvas, 0, 0, width, newHeight, 0, 0, width, newHeight);

        canvas.height = newHeight;
        ctx.drawImage(tempCanvas, 0, 0);
    }
}


// Function to run on exam.html to get the massive file back out!
function fetchPdfFromDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("MockOS_Storage", 1);
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction("pdfs", "readonly");
            const store = transaction.objectStore("pdfs");
            
            const getRequest = store.get("custom_test_paper");
            
            getRequest.onsuccess = () => {
                const rawFile = getRequest.result;
                if (rawFile) {
                    // Turn the raw file back into a temporary local URL for the PDF viewer!
                    const fastUrl = URL.createObjectURL(rawFile);
                    resolve(fastUrl); 
                } else {
                    reject("File not found in database.");
                }
            };
        };
        request.onerror = (err) => reject(err);
    });
}


document.addEventListener('DOMContentLoaded', async () => {
    
    const configData = localStorage.getItem('mockos_current_exam');
    if (!configData) {
        window.location.href = "index.html";
        return;
    }

    const config = JSON.parse(configData);

    // Block web links instantly to prevent crashes, forcing the use of the local library
    if (config.url.startsWith('http')) {
        alert("This paper is not in your local library!\n\nPlease run the Python sync script to download it to your 'papers/pdfs' folder for instant, offline access.");
        window.location.href = "index.html";
        return;
    }

    if (config.url === "DATABASE_FETCH_REQUIRED") {
        try {
            // Added 'await' so it actually waits for the file to be pulled from the database!
            config.url = await fetchPdfFromDatabase(); 
        } catch (error) {
            alert("Could not retrieve your custom paper from the secure database.");
            console.error(error);
            window.location.href = "index.html";
            return;
        }
    }

    try {
        document.querySelector('.exam-title').innerText = "Loading Secure Local Paper...";
        
        // Load the PDF directly from your hard drive (0ms latency)
        const loadingTask = pdfjsLib.getDocument(config.url);
        currentPDF = await loadingTask.promise;
        
        const autoMap = await autoGenerateExamMap(currentPDF);
        const answerKey = await extractAnswerKey(currentPDF);
        
        document.querySelector('.exam-title').innerText = config.name || "realCBT Mock Exam";

        if (typeof startExam === "function") {
            startExam(autoMap, answerKey, config); 
        }
    } catch (error) {
        console.error(error);
        alert(`Failed to load the PDF from ${config.url}. Make sure the file exists in your papers/pdfs folder!`);
        window.location.href = "index.html";
    }
});

// --- 5. MathonGo Answer Key Extractor (Keep your existing extractor code below this) ---

// --- 5. MathonGo Answer Key Extractor ---
async function extractAnswerKey(pdf) {
    const lastPage = await pdf.getPage(pdf.numPages);
    const textContent = await lastPage.getTextContent();
    const fullText = textContent.items.map(item => item.str).join(" ");
    
    const keyMap = {};
    // Regex safely captures both MCQs "1. (4)" and Numericals "21. (34)" or "22. (-5)"
    const regex = /(\d+)\.\s*\(([-.\d]+|Bonus)\)/g; 
    let match;
    
    while ((match = regex.exec(fullText)) !== null) {
        keyMap[parseInt(match[1])] = match[2].trim();
    }
    
    console.log("Successfully Extracted Answer Key");
    return keyMap;
}

function determineSubject(qNumber) {
    if (qNumber <= 25) return "Physics";
    if (qNumber <= 50) return "Chemistry";
    return "Mathematics";
}