const { randomUUID } = require("crypto");

const analysisSessions = new Map();
const webhookReports = new Map();

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
  webhookReports.set(key, {
    ...payload,
    updatedAt: new Date().toISOString()
  });
}

function getWebhookReport(key) {
  return webhookReports.get(key) || null;
}

module.exports = {
  createAnalysisSession,
  getAnalysisSession,
  saveWebhookReport,
  getWebhookReport
};
