import {
  api,
  bindLogout,
  escapeHtml,
  requireAuth,
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
const queueRoot = document.querySelector("#queue-root");

let pollTimer = 0;

async function fetchJobs() {
  try {
    const response = await api("/api/video-jobs");
    renderJobs(response.jobs || []);
  } catch (error) {
    setFlash(flashRoot, error.message, "error");
    stopPolling();
  }
}

function renderJobs(jobs) {
  if (!jobs.length) {
    queueRoot.innerHTML = `<article class="panel"><h3>No render jobs</h3><p>Create one from Dashboard or Lesson page.</p></article>`;
    return;
  }

  queueRoot.innerHTML = jobs.map((job) => `
    <article class="job-row" data-reveal>
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <strong>${escapeHtml(job.title)}</strong>
        <span class="status-pill">${escapeHtml(job.status)}</span>
      </div>
      <small>${escapeHtml(job.stage || "Queued")}</small>
      <div class="progress"><span style="width:${escapeHtml(String(job.progress || 0))}%"></span></div>
      <small>${escapeHtml(String(job.progress || 0))}% complete</small>
      ${job.status === "completed" ? `<button class="btn" type="button" data-manifest="${escapeHtml(job.id)}">Download manifest</button>` : ""}
    </article>
  `).join("");

  queueRoot.querySelectorAll("[data-manifest]").forEach((button) => {
    button.addEventListener("click", async () => {
      const jobId = button.dataset.manifest || "";
      try {
        const manifestResponse = await api(`/api/video-jobs/${encodeURIComponent(jobId)}/manifest`);
        const blob = new Blob([JSON.stringify(manifestResponse.manifest, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${jobId}-manifest.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setFlash(flashRoot, "Manifest downloaded.");
      } catch (error) {
        setFlash(flashRoot, error.message, "error");
      }
    });
  });

  const hasActive = jobs.some((job) => job.status !== "completed" && job.status !== "failed");
  if (!hasActive) {
    stopPolling();
  }

  initRevealCards();
}

function startPolling() {
  if (pollTimer) {
    return;
  }
  pollTimer = window.setInterval(fetchJobs, 2200);
}

function stopPolling() {
  if (!pollTimer) {
    return;
  }
  window.clearInterval(pollTimer);
  pollTimer = 0;
}

fetchJobs();
startPolling();
