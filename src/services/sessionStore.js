const { randomUUID } = require("crypto");

const analysisSessions = new Map();
const webhookReports = new Map();

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

module.exports = {
  createAnalysisSession,
  getAnalysisSession,
  saveWebhookReport,
  getWebhookReport,
  saveWorkspaceReport,
  getWorkspaceReport
};
