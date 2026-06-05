const { randomUUID } = require("crypto");

const analysisSessions = new Map();
const webhookReports = new Map();
const savedProjects = new Map();

function buildWorkspaceReportKey(provider, repository) {
  return `${String(provider || "generic").trim().toLowerCase()}:${String(repository || "")
    .trim()
    .toLowerCase()}`;
}

function createAnalysisSession(payload) {
  const id = randomUUID();
  analysisSessions.set(id, {
    ...payload,
    createdAt: new Date().toISOString()
  });
  return id;
}

function getAnalysisSession(id) {
  return analysisSessions.get(id) || null;
}

function saveWebhookReport(key, payload) {
  webhookReports.set(buildWorkspaceReportKey("github", key), {
    ...payload,
    updatedAt: new Date().toISOString()
  });
}

function getWebhookReport(key) {
  return webhookReports.get(buildWorkspaceReportKey("github", key)) || null;
}

function saveWorkspaceReport(provider, repository, payload) {
  webhookReports.set(buildWorkspaceReportKey(provider, repository), {
    ...payload,
    updatedAt: new Date().toISOString()
  });
}

function getWorkspaceReport(provider, repository) {
  return webhookReports.get(buildWorkspaceReportKey(provider, repository)) || null;
}

function getSavedProjects(userId) {
  const key = String(userId || "demo-recruiter").trim().toLowerCase();
  return savedProjects.get(key) || [];
}

function saveProject(userId, payload) {
  const key = String(userId || "demo-recruiter").trim().toLowerCase();
  const project = {
    id: randomUUID(),
    name: String(payload.name || "Untitled architecture review").trim(),
    repository: String(payload.repository || "unknown/repository").trim(),
    score: Number(payload.score || 82),
    status: String(payload.status || "Saved"),
    updatedAt: new Date().toISOString()
  };
  const nextProjects = [project, ...getSavedProjects(key)].slice(0, 8);
  savedProjects.set(key, nextProjects);
  return project;
}

module.exports = {
  createAnalysisSession,
  getAnalysisSession,
  saveWebhookReport,
  getWebhookReport,
  saveWorkspaceReport,
  getWorkspaceReport,
  getSavedProjects,
  saveProject
};
