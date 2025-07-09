const lang = {
  es: {
    title: "Roblox Parental Control",
    start: "Inicio Automático",
    timer: "Tiempo restante:",
    github: "GitHub",
    progress: (done, total, percent) => `Bloqueando ${done} de ${total} IDs (${percent}%)`
  },
  en: {
    title: "Roblox Parental Control",
    start: "Start Auto",
    timer: "Time remaining:",
    github: "GitHub",
    progress: (done, total, percent) => `Blocking ${done} of ${total} IDs (${percent}%)`
  }
};

const langSelect = document.getElementById("langSelect");
const currentLang = localStorage.getItem("robloxLang") || "es";
langSelect.value = currentLang;

function updateTexts() {
  const selected = lang[langSelect.value];
  document.getElementById("title").textContent = selected.title;
  document.getElementById("startBtn").textContent = selected.start;
  document.getElementById("labelTimer").textContent = selected.timer;
  document.getElementById("githubLink").textContent = selected.github;
  if (window.currentProgress)
    document.getElementById("progress").textContent = selected.progress(...window.currentProgress);
}

langSelect.addEventListener("change", () => {
  localStorage.setItem("robloxLang", langSelect.value);
  updateTexts();
});

document.getElementById("startBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "startAutomatedFlow" });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "updateTimer") {
    document.getElementById("timer").textContent = msg.timeLeft;
  } else if (msg.action === "updateProgress") {
    window.currentProgress = [msg.done, msg.total, msg.percent];
    document.getElementById("progress").textContent = lang[langSelect.value].progress(...window.currentProgress);
  }
});

updateTexts();