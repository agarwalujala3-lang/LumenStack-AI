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
import { initNebula, initRevealCards, initTiltCards } from "./graphics.js";

if (!requireAuth()) {
  // Redirect handled in requireAuth.
}

initNebula();
initRevealCards();
initTiltCards();
bindLogout();

const flashRoot = document.querySelector("#flash-root");
const profileBlock = document.querySelector("#profile-block");
const analyzeForm = document.querySelector("#analyze-form");
const outputBlock = document.querySelector("#output-block");
const renderBtn = document.querySelector("#render-video-btn");
const sourceField = document.querySelector("#source-url");

const state = {
  app: null,
  experience: loadExperience()
};

async function start() {
  if (state.experience) {
    renderSummary(state.experience);
  }

  try {
    const response = await api("/api/app");
    state.app = response.app;
    profileBlock.innerHTML = `
      <strong>${escapeHtml(state.app.user.name)}</strong>
      <small>${escapeHtml(state.app.user.email)}</small>
      <small>Active renders: ${escapeHtml(String(state.app.videoStudio?.activeCount || 0))}</small>
    `;
  } catch (error) {
    setFlash(flashRoot, error.message, "error");
  }
}

analyzeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formPayload = Object.fromEntries(new FormData(analyzeForm).entries());
  if (!String(formPayload.sourceUrl || "").trim()) {
    setFlash(flashRoot, "Paste a YouTube URL first.", "error");
    return;
  }
  setFlash(flashRoot, "Teaching the video in Class 1 style...");
  outputBlock.innerHTML = "";
  try {
    const response = await api("/api/source/analyze", {
      method: "POST",
      body: JSON.stringify({
        sourceUrl: formPayload.sourceUrl,
        focus: "Explain this YouTube video like teaching a Class 1 student with simple animation and visual flow.",
        depth: "deep",
        animationMode: "cinematic"
      })
    });
    state.experience = response.sourceExperience;
    saveExperience(state.experience);
    renderSummary(state.experience);
    setFlash(flashRoot, "Done. Open Lessons, Visuals, or Notes for full explain view.");
  } catch (error) {
    setFlash(flashRoot, error.message, "error");
  }
});

renderBtn.addEventListener("click", async () => {
  if (!state.experience) {
    setFlash(flashRoot, "Generate a lesson first.", "error");
    return;
  }

  setFlash(flashRoot, "Creating cinematic render job...");
  try {
    await api("/api/video-jobs/create", {
      method: "POST",
      body: JSON.stringify({
        topic: state.experience.topic,
        sourceExperience: state.experience,
        renderStyle: "cinematic"
      })
    });
    setFlash(flashRoot, "Video job created. Open Queue page to watch progress.");
  } catch (error) {
    setFlash(flashRoot, error.message, "error");
  }
});

function renderSummary(experience) {
  const kidsMode = experience.kidsMode || {};
  const simpleLines = safeArray(kidsMode.simpleLines);
  const storyCards = safeArray(kidsMode.storyCards);
  const source = experience.source || {};
  const embedUrl = source.embedUrl || "";

  const imageBank = [
    "/assets/scene-village-dawn.svg",
    "/assets/scene-cloud-park.svg",
    "/assets/scene-story-city.svg",
    "/assets/scene-neon-night.svg"
  ];

  outputBlock.innerHTML = `
    <section class="cards-grid three">
      <article class="metric-card" data-reveal>
        <small>Topic</small>
        <strong>${escapeHtml(experience.topic)}</strong>
      </article>
      <article class="metric-card" data-reveal>
        <small>Class 1 lines</small>
        <strong>${escapeHtml(String(simpleLines.length))}</strong>
      </article>
      <article class="metric-card" data-reveal>
        <small>Story cards</small>
        <strong>${escapeHtml(String(storyCards.length))}</strong>
      </article>
    </section>
    <article class="panel stack" data-reveal>
      <h3>${escapeHtml(kidsMode.headline || "Class 1 teacher mode")}</h3>
      <ul>
        ${simpleLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
      </ul>
      <div class="action-row">
        <a class="btn" href="/lesson.html">Open Lessons</a>
        <a class="btn" href="/visuals.html">Open Visuals</a>
        <a class="btn" href="/notes.html">Open Notes</a>
      </div>
    </article>
    <section class="cards-grid two">
      <article class="panel stack tilt-card" data-reveal>
        <div class="tilt-inner stack">
          <div class="kicker">Story Scene Pack</div>
          <div class="story-grid">
            ${storyCards.map((card, index) => `
              <article class="story-card">
                <img src="${escapeHtml(imageBank[index % imageBank.length])}" alt="Story scene ${index + 1}" />
                <div class="copy">
                  <strong>${escapeHtml(card.title || `Scene ${index + 1}`)}</strong>
                  <small>${escapeHtml(card.line || "")}</small>
                </div>
              </article>
            `).join("")}
          </div>
        </div>
      </article>
      <article class="panel stack" data-reveal>
        <div class="kicker">Source Preview</div>
        <p><strong>${escapeHtml(source.title || experience.topic)}</strong></p>
        <p>${escapeHtml(source.description || "The source content was converted into a child-friendly animated lesson path.")}</p>
        ${embedUrl ? `
          <div class="video-frame">
            <iframe src="${escapeHtml(embedUrl)}" title="Source video preview" loading="lazy" allowfullscreen></iframe>
          </div>
        ` : `<small>No embeddable player found for this URL, but full explanation is generated.</small>`}
      </article>
    </section>
  `;

  initTiltCards();
  initRevealCards();
}

sourceField?.addEventListener("paste", () => setFlash(flashRoot, ""));

start();
