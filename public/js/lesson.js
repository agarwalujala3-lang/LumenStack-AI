import {
  api,
  bindLogout,
  escapeHtml,
  loadExperience,
  requireAuth,
  saveExperience,
  safeArray,
  setFlash
} from "./common.js";
import { initNebula, initRevealCards } from "./graphics.js";

if (!requireAuth()) {
  // Redirect handled in requireAuth.
}

initNebula();
initRevealCards();
bindLogout();

const flashRoot = document.querySelector("#flash-root");
const lessonRoot = document.querySelector("#lesson-root");
const chapterRoot = document.querySelector("#chapter-root");
const autoplayBtn = document.querySelector("#autoplay-btn");
const saveBtn = document.querySelector("#save-btn");

const state = {
  experience: loadExperience(),
  chapterIndex: 0,
  autoplay: false,
  timer: 0
};

function sceneFor(index) {
  const scenes = [
    "/assets/scene-neon-night.svg",
    "/assets/scene-story-city.svg",
    "/assets/scene-village-dawn.svg",
    "/assets/scene-cloud-park.svg"
  ];
  return scenes[index % scenes.length];
}

function render() {
  if (!state.experience) {
    lessonRoot.innerHTML = `<article class="panel"><h3>No lesson yet</h3><p>Go to Dashboard and paste a YouTube URL first.</p></article>`;
    chapterRoot.innerHTML = "";
    return;
  }

  const chapters = safeArray(state.experience.animatedLesson?.chapters);
  const chapter = chapters[state.chapterIndex] || chapters[0] || {
    title: "Lesson chapter",
    summary: "Your generated lesson chapter will appear here after analysis.",
    cameraMove: "Static wide shot"
  };
  const storyCards = safeArray(state.experience.kidsMode?.storyCards);
  const simpleLines = safeArray(state.experience.kidsMode?.simpleLines);
  const headline = state.experience.kidsMode?.headline || "Class 1 teacher mode";
  const lessonTitle = state.experience.animatedLesson?.title || `${state.experience.topic} lesson`;

  lessonRoot.innerHTML = `
    <article class="panel stack" data-reveal>
      <div class="kicker">Animated Lesson</div>
      <h2>${escapeHtml(lessonTitle)}</h2>
      <p>${escapeHtml(chapter.summary)}</p>
      <img src="${escapeHtml(sceneFor(state.chapterIndex))}" alt="${escapeHtml(chapter.title)}" style="width:100%;height:280px;object-fit:cover;border-radius:18px;border:1px solid var(--line);" />
      <small>${escapeHtml(chapter.cameraMove)}</small>
    </article>
    <article class="panel stack" data-reveal>
      <div class="kicker">Class 1 Explain</div>
      <h3>${escapeHtml(headline)}</h3>
      <ul>
        ${simpleLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
      </ul>
    </article>
    <article class="panel stack" data-reveal>
      <div class="kicker">Mini Story Boards</div>
      <div class="story-grid">
        ${storyCards.map((card, index) => `
          <article class="story-card">
            <img src="${escapeHtml(sceneFor(index + 2))}" alt="Story card ${index + 1}" />
            <div class="copy">
              <strong>${escapeHtml(card.title || `Story ${index + 1}`)}</strong>
              <small>${escapeHtml(card.line || "")}</small>
            </div>
          </article>
        `).join("")}
      </div>
    </article>
  `;

  chapterRoot.innerHTML = chapters.map((item, index) => `
    <button class="side-item ${index === state.chapterIndex ? "active" : ""}" type="button" data-chapter="${index}">
      <strong>${escapeHtml(`Chapter ${index + 1}`)}</strong>
      <small>${escapeHtml(item.title)}</small>
    </button>
  `).join("");

  chapterRoot.querySelectorAll("[data-chapter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.chapterIndex = Number(button.dataset.chapter || 0);
      render();
    });
  });

  initRevealCards();
}

function syncAutoplay() {
  if (state.autoplay && !state.timer && safeArray(state.experience?.animatedLesson?.chapters).length) {
    state.timer = window.setInterval(() => {
      const count = safeArray(state.experience.animatedLesson.chapters).length;
      state.chapterIndex = (state.chapterIndex + 1) % count;
      render();
    }, 4200);
  } else if (!state.autoplay && state.timer) {
    window.clearInterval(state.timer);
    state.timer = 0;
  }
}

autoplayBtn.addEventListener("click", () => {
  state.autoplay = !state.autoplay;
  autoplayBtn.textContent = state.autoplay ? "Stop Auto-play" : "Auto-play Chapters";
  syncAutoplay();
});

saveBtn.addEventListener("click", async () => {
  if (!state.experience) {
    setFlash(flashRoot, "No lesson to save.", "error");
    return;
  }
  try {
    const response = await api("/api/library/lesson/save", {
      method: "POST",
      body: JSON.stringify({
        source: "class1-youtube",
        plan: state.experience
      })
    });
    saveExperience(state.experience);
    setFlash(flashRoot, `Lesson saved. Total saved: ${response.app.savedLibrary.lessons.length}`);
  } catch (error) {
    setFlash(flashRoot, error.message, "error");
  }
});

render();
syncAutoplay();
