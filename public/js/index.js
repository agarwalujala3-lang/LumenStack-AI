import { getToken } from "./common.js";
import { initNebula, initRevealCards, initTiltCards } from "./graphics.js";

initNebula();
initTiltCards();
initRevealCards();

const startBtn = document.querySelector("#start-btn");
const quickBtn = document.querySelector("#quick-btn");
const studioPreview = document.querySelector("#studio-preview");

if (getToken()) {
  startBtn.href = "/dashboard.html";
  startBtn.textContent = "Open Dashboard";
  quickBtn.href = "/lesson.html";
  quickBtn.textContent = "Resume Lesson";
  if (studioPreview) {
    studioPreview.href = "/dashboard.html";
  }
} else {
  startBtn.href = "/login.html";
  quickBtn.href = "/signup.html";
  if (studioPreview) {
    studioPreview.href = "/login.html";
  }
}
