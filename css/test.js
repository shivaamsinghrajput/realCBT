function openReviewModal(qIndex) {
  const qData = mockTestDatabase.questions[qIndex];
  const userState = examState.userResponses[qIndex];
  const realAns = mockTestDatabase.answerKey[qData.question_id];

  // --- 1. Header & Stats ---
  document.getElementById("review-q-title").innerText =
    `Mistake Analyzer: Q${qData.question_id} (${qData.subject})`;

  let timeSpent = userState.timeSpent || 0;
  let timeStr =
    timeSpent > 120
      ? `${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s`
      : `${timeSpent}s`;

  let statusText = userState.status.includes("answered")
    ? String(userState.selectedOption).trim() === String(realAns).trim()
      ? "Correct"
      : "Incorrect"
    : "Unanswered";

  document.getElementById("review-q-stats").innerText =
    `Time Taken: ${timeStr} | Status: ${statusText}`;

  document.getElementById("rev-user-ans").innerText =
    userState.selectedOption || "Blank";
  document.getElementById("rev-real-ans").innerText = realAns || "Bonus";

  const canvasContainer = document.getElementById("review-q-canvas");
  canvasContainer.innerHTML =
    "<p style='color: var(--text-muted); padding: 20px; font-weight: bold;'>Rendering...</p>";

  document.getElementById("review-modal").classList.add("active");

  // --- 2. Render original question temporarily ---
  const originalIndex = examState.currentIndex;
  examState.currentIndex = qIndex;
  updateUIForCurrentQuestion();

  // --- 3. Extract canvas cleanly ---
  setTimeout(() => {
    const allCanvases = Array.from(document.getElementsByTagName("canvas"));

    // exclude charts & modal canvases
    const examCanvas = allCanvases.find(
      (c) => c.id !== "resultChart" && !c.closest(".modal-overlay"),
    );

    if (examCanvas) {
      // 🔥 PERFECT PIXEL COPY
      const cloneCanvas = document.createElement("canvas");
      const ctx = cloneCanvas.getContext("2d");

      // 🔥 TUNE THESE VALUES
      const crop = {
        x: 0, // start X
        y: 0, // start Y
        width: examCanvas.width,
        height: examCanvas.height,
      };

      // 👉 OPTIONAL: trim top whitespace (most common issue)
      crop.y = 20; // shift down
      crop.height -= 20;

      // 👉 OPTIONAL: trim bottom whitespace
      crop.height -= 30;

      // 👉 OPTIONAL: trim left/right if needed
      crop.x = 10;
      crop.width -= 20;

      // set new canvas size = cropped size
      cloneCanvas.width = crop.width;
      cloneCanvas.height = crop.height;

      // 🔥 crop while drawing
      ctx.drawImage(
        examCanvas,
        crop.x,
        crop.y,
        crop.width,
        crop.height, // source
        0,
        0,
        crop.width,
        crop.height, // destination
      );

      // styling (no distortion)
      cloneCanvas.style.display = "block";
      cloneCanvas.style.margin = "0 auto";
      cloneCanvas.style.maxWidth = "100%";
      cloneCanvas.style.height = "auto";
      cloneCanvas.style.background = "white";
      cloneCanvas.style.borderRadius = "6px";

      canvasContainer.innerHTML = "";
      canvasContainer.style.padding = "0";
      canvasContainer.style.background = "transparent";
      canvasContainer.appendChild(cloneCanvas);
    } else {
      canvasContainer.innerHTML =
        "<p style='color:red'>Failed to capture question.</p>";
    }

    // --- 4. Restore original state ---
    examState.currentIndex = originalIndex;
    updateUIForCurrentQuestion();
  }, 120); // small delay to ensure render
}
