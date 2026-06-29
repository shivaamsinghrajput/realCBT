
const targetExams={
  "JEE Mains 2027":"2027-01-21",
  "JEE Advanced 2027":"2027-05-15",
}

function loadUserProfile() {
  const nameEl = document.getElementById("candidate-name");
  const avatarEl = document.getElementById("candidate-avatar");
  const targetEl = document.getElementById("target-exam");
  const daysLeft=document.getElementById('days-left-count')

  // 1. Fetch Profile Data
  if (nameEl && avatarEl) {
    const storedName = localStorage.getItem("studentName");
    const storedImage = localStorage.getItem("studentImage");

    if (storedName && storedName.trim() !== "") {
      nameEl.innerText = storedName;
    } else {
      nameEl.innerText = "XYZ User";
    }

    if (storedImage && storedImage.trim() !== "") {
      avatarEl.src = storedImage;
    } else {
      // THE FIX: Professional Gray User Silhouette SVG
      const defaultUserSVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239ca3af"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
      avatarEl.src = defaultUserSVG;
    }
  }

  // 2. Fetch Target Exam Data
  if (targetEl && daysLeft) {
    var storedTarget = localStorage.getItem("userTarget");
    if (!(storedTarget && storedTarget.trim() !== "")) {
      storedTarget="JEE Mains 2027"
    }
    const examDATE = targetExams[storedTarget]
    if (!examDATE) {
      examDATE="01-01-2027"
    }
    const today=new Date()
    const target=new Date(examDATE)
    today.setHours(0,0,0,0)
    target.setHours(0,0,0,0)
    const diffMs=target-today
    const diffDays=Math.ceil(diffMs/(1000*60*60*24))
    daysLeft.innerText=diffDays
    targetEl.innerText = storedTarget;
  }
}


document.addEventListener("DOMContentLoaded",loadUserProfile)