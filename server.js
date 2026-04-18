import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSessionToken, hashPassword, verifyPassword } from "./lib/auth.js";
import {
  advanceSceneTimeline,
  buildAppState,
  completeMissionProgress,
  createInitialProgress,
  createLearnerProfile,
  evaluateTrainingGroundAttempt,
  evaluateWorkspaceSubmission,
  generateProjectBlueprint,
  generateTrainingGroundPack,
  generateUniversalCoursePlan,
  generateMentorResponse,
  getPortfolioEvidence,
  getMeta,
  reviewMissionExplanation,
  saveLessonToProgress,
  saveProjectToProgress
} from "./lib/engine.js";
import { generateSourceLearningExperience } from "./lib/source-intake.js";
import { supportLanguages, tracks } from "./lib/catalog.js";
import {
  createSession,
  createUserRecord,
  findUserByEmail,
  findUserById,
  findUserBySessionToken,
  removeSession,
  updateUserRecord
} from "./lib/storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const port = process.env.PORT || 3000;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

const SOCIAL_PROVIDERS = new Set(["google", "github", "linkedin"]);
const OAUTH_PROVIDER_CONFIG = {
  google: {
    clientIdKey: "LUMINA_GOOGLE_CLIENT_ID",
    clientSecretKey: "LUMINA_GOOGLE_CLIENT_SECRET",
    enabledKey: "LUMINA_GOOGLE_OAUTH_ENABLED",
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    scopes: ["openid", "email", "profile"]
  },
  github: {
    clientIdKey: "LUMINA_GITHUB_CLIENT_ID",
    clientSecretKey: "LUMINA_GITHUB_CLIENT_SECRET",
    enabledKey: "LUMINA_GITHUB_OAUTH_ENABLED",
    authorizationEndpoint: "https://github.com/login/oauth/authorize",
    tokenEndpoint: "https://github.com/login/oauth/access_token",
    scopes: ["read:user", "user:email"]
  },
  linkedin: {
    clientIdKey: "LUMINA_LINKEDIN_CLIENT_ID",
    clientSecretKey: "LUMINA_LINKEDIN_CLIENT_SECRET",
    enabledKey: "LUMINA_LINKEDIN_OAUTH_ENABLED",
    authorizationEndpoint: "https://www.linkedin.com/oauth/v2/authorization",
    tokenEndpoint: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["openid", "profile", "email"]
  }
};
const phoneChallenges = new Map();
const oauthStates = new Map();
const videoJobTimers = new Map();

export function createServer() {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    try {
      if (request.method === "GET" && url.pathname === "/healthz") {
        sendJson(response, 200, { ok: true, service: "lumina-learn-ai" });
        return;
      }

      if (url.pathname.startsWith("/api/")) {
        await handleApi(request, response, url);
        return;
      }

      await serveStatic(url.pathname, response);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: "Internal server error" });
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const server = createServer();
  server.listen(port, () => {
    console.log(`Lumina Learn AI running at http://localhost:${port}`);
  });
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/bootstrap") {
    sendJson(response, 200, getMeta());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/signup") {
    const body = await readJsonBody(request);
    await handleSignup(body, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readJsonBody(request);
    await handleLogin(body, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    const token = getBearerToken(request);
    if (token) {
      await removeSession(token);
    }
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/auth/providers") {
    sendJson(response, 200, { providers: buildProviderCapabilities() });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/provider/login") {
    const body = await readJsonBody(request);
    await handleProviderLogin(body, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/auth/provider/start") {
    await handleProviderOAuthStart(request, response, url);
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/auth/provider/callback/")) {
    await handleProviderOAuthCallback(request, response, url);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/phone/request") {
    const body = await readJsonBody(request);
    await handlePhoneRequest(body, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/phone/verify") {
    const body = await readJsonBody(request);
    await handlePhoneVerify(body, response);
    return;
  }

  const user = await getAuthenticatedUser(request, response);
  if (!user) {
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/app") {
    sendJson(response, 200, { app: buildAppState(user) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/video-jobs/create") {
    const body = await readJsonBody(request);
    const job = createVideoJob(user, body);
    user.progress.videoJobs = dedupeVideoJobs([...(user.progress.videoJobs ?? []), job]);
    const updated = await updateUserRecord(user);
    scheduleVideoJobProgress(updated.id, job.id);
    sendJson(response, 201, { job, jobs: [...updated.progress.videoJobs].reverse(), app: buildAppState(updated) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/video-jobs") {
    sendJson(response, 200, { jobs: [...(user.progress.videoJobs ?? [])].reverse() });
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/video-jobs/")) {
    const segments = url.pathname.split("/").filter(Boolean);
    const jobId = segments[2] || "";
    const job = (user.progress.videoJobs ?? []).find((item) => item.id === jobId);

    if (!job) {
      sendJson(response, 404, { error: "Video job not found." });
      return;
    }

    if (segments[3] === "manifest") {
      sendJson(response, 200, { manifest: buildVideoManifest(job) });
      return;
    }

    sendJson(response, 200, { job });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/track/select") {
    const body = await readJsonBody(request);
    const track = tracks.find((item) => item.id === body.trackId) ?? tracks[0];
    user.progress.selectedTrackId = track.id;
    user.progress.currentMissionId = track.missions[0].id;
    user.progress.sceneProgress = user.progress.sceneProgress ?? {};
    user.progress.sceneProgress[track.missions[0].id] = user.progress.sceneProgress[track.missions[0].id] ?? {
      currentState: "trigger",
      completedStates: ["trigger"],
      phase: "micro-cinematic",
      updatedAt: new Date().toISOString()
    };
    const updated = await updateUserRecord(user);
    sendJson(response, 200, { app: buildAppState(updated) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/mission/select") {
    const body = await readJsonBody(request);
    user.progress.currentMissionId = body.missionId || user.progress.currentMissionId;
    const updated = await updateUserRecord(user);
    sendJson(response, 200, { app: buildAppState(updated) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/preferences/update") {
    const body = await readJsonBody(request);
    user.profile.preferredSceneStyle = body.sceneStyle || user.profile.preferredSceneStyle;
    user.profile.captionsEnabled = body.captionsEnabled !== undefined ? Boolean(body.captionsEnabled) : user.profile.captionsEnabled;
    user.profile.voiceEnabled = body.voiceEnabled !== undefined ? Boolean(body.voiceEnabled) : user.profile.voiceEnabled;
    user.profile.uiTheme = body.uiTheme || user.profile.uiTheme;
    user.progress.roleLensId = body.roleLensId || user.progress.roleLensId;
    if (body.primaryLanguage) {
      user.profile.primaryLanguage = supportLanguages.find((item) => item.id === body.primaryLanguage) || user.profile.primaryLanguage;
    }
    if (body.bridgeLanguage) {
      user.profile.bridgeLanguage = supportLanguages.find((item) => item.id === body.bridgeLanguage) || user.profile.bridgeLanguage;
    }
    const updated = await updateUserRecord(user);
    sendJson(response, 200, { app: buildAppState(updated) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/scene/advance") {
    const body = await readJsonBody(request);
    const sceneUpdate = advanceSceneTimeline(user, body);
    user.progress = sceneUpdate.progress;
    user.progress.missionHistory = user.progress.missionHistory ?? [];
    user.progress.missionHistory.push({
      missionId: sceneUpdate.missionId,
      action: "scene-advanced",
      state: sceneUpdate.state.currentState,
      at: new Date().toISOString()
    });
    const updated = await updateUserRecord(user);
    sendJson(response, 200, { scene: sceneUpdate, app: buildAppState(updated) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/workspace/save") {
    const body = await readJsonBody(request);
    const missionId = body.missionId || user.progress.currentMissionId;
    user.progress.drafts = user.progress.drafts ?? {};
    user.progress.missionHistory = user.progress.missionHistory ?? [];
    user.progress.drafts[missionId] = {
      implementationPlan: body.implementationPlan || "",
      codeAttempt: body.codeAttempt || "",
      notes: body.notes || "",
      updatedAt: new Date().toISOString()
    };
    const evaluation = evaluateWorkspaceSubmission(user, {
      missionId,
      implementationPlan: body.implementationPlan,
      codeAttempt: body.codeAttempt,
      notes: body.notes
    });
    user.progress.missionHistory.push({
      missionId,
      action: "draft-saved",
      at: new Date().toISOString(),
      score: evaluation.score
    });
    const updated = await updateUserRecord(user);
    sendJson(response, 200, { evaluation, app: buildAppState(updated) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/workspace/evaluate") {
    const body = await readJsonBody(request);
    const missionId = body.missionId || user.progress.currentMissionId;
    user.progress.drafts = user.progress.drafts ?? {};
    user.progress.missionHistory = user.progress.missionHistory ?? [];
    user.progress.drafts[missionId] = {
      implementationPlan: body.implementationPlan || "",
      codeAttempt: body.codeAttempt || "",
      notes: body.notes || "",
      updatedAt: new Date().toISOString()
    };
    const evaluation = evaluateWorkspaceSubmission(user, {
      missionId,
      implementationPlan: body.implementationPlan,
      codeAttempt: body.codeAttempt,
      notes: body.notes
    });
    user.progress.missionHistory.push({
      missionId,
      action: "ticket-evaluated",
      at: new Date().toISOString(),
      score: evaluation.score,
      status: evaluation.ticketStatus
    });
    const updated = await updateUserRecord(user);
    sendJson(response, 200, { evaluation, app: buildAppState(updated) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/mentor/help") {
    const body = await readJsonBody(request);
    const help = generateMentorResponse(user, body);
    user.progress.mentorHistory = user.progress.mentorHistory ?? [];
    user.progress.mentorHistory.push({
      missionId: body.missionId || user.progress.currentMissionId,
      issueType: body.issueType || "stuck",
      lane: body.lane || "cinematic",
      at: new Date().toISOString()
    });
    await updateUserRecord(user);
    sendJson(response, 200, { help });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/review/run") {
    const body = await readJsonBody(request);
    const review = reviewMissionExplanation(user, body);
    user.progress.reviewHistory = user.progress.reviewHistory ?? [];
    user.progress.debriefHistory = user.progress.debriefHistory ?? [];
    user.progress.reviewHistory.push({
      missionId: body.missionId || user.progress.currentMissionId,
      at: new Date().toISOString(),
      score: review.score,
      status: review.status
    });
    user.progress.debriefHistory.push({
      missionId: body.missionId || user.progress.currentMissionId,
      at: new Date().toISOString(),
      score: review.score,
      status: review.status
    });
    const updated = await updateUserRecord(user);
    sendJson(response, 200, { review, app: buildAppState(updated) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/debrief/run") {
    const body = await readJsonBody(request);
    const review = reviewMissionExplanation(user, body);
    user.progress.debriefHistory = user.progress.debriefHistory ?? [];
    user.progress.debriefHistory.push({
      missionId: body.missionId || user.progress.currentMissionId,
      at: new Date().toISOString(),
      score: review.score,
      status: review.status
    });
    const updated = await updateUserRecord(user);
    sendJson(response, 200, { debrief: review, app: buildAppState(updated) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/portfolio/evidence") {
    sendJson(response, 200, { evidence: getPortfolioEvidence(user) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/course/plan") {
    const body = await readJsonBody(request);
    const plan = generateUniversalCoursePlan(user, body);
    user.progress.missionHistory = user.progress.missionHistory ?? [];
    user.progress.missionHistory.push({
      action: "course-plan-generated",
      topic: plan.topic,
      at: new Date().toISOString()
    });
    await updateUserRecord(user);
    sendJson(response, 200, { plan });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/library/lesson/save") {
    const body = await readJsonBody(request);
    const saved = saveLessonToProgress(user, body);
    user.progress = saved.progress;
    user.progress.missionHistory = user.progress.missionHistory ?? [];
    user.progress.missionHistory.push({
      action: "lesson-saved",
      topic: saved.entry.topic,
      at: new Date().toISOString()
    });
    const updated = await updateUserRecord(user);
    sendJson(response, 200, { savedLesson: saved.entry, app: buildAppState(updated) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/source/analyze") {
    const body = await readJsonBody(request);
    const sourceExperience = await generateSourceLearningExperience(user, body);
    user.progress.missionHistory = user.progress.missionHistory ?? [];
    user.progress.missionHistory.push({
      action: "source-analyzed",
      topic: sourceExperience.topic,
      sourceUrl: sourceExperience.source.url,
      at: new Date().toISOString()
    });
    await updateUserRecord(user);
    sendJson(response, 200, { sourceExperience });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/training/pack") {
    const body = await readJsonBody(request);
    const pack = generateTrainingGroundPack(user, body);
    user.progress.missionHistory = user.progress.missionHistory ?? [];
    user.progress.missionHistory.push({
      action: "training-pack-generated",
      topic: pack.topic,
      at: new Date().toISOString()
    });
    await updateUserRecord(user);
    sendJson(response, 200, { pack });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/project/blueprint") {
    const body = await readJsonBody(request);
    const project = generateProjectBlueprint(user, body);
    user.progress.missionHistory = user.progress.missionHistory ?? [];
    user.progress.missionHistory.push({
      action: "project-generated",
      topic: project.topic,
      at: new Date().toISOString()
    });
    await updateUserRecord(user);
    sendJson(response, 200, { project });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/library/project/save") {
    const body = await readJsonBody(request);
    const saved = saveProjectToProgress(user, body);
    user.progress = saved.progress;
    user.progress.missionHistory = user.progress.missionHistory ?? [];
    user.progress.missionHistory.push({
      action: "project-saved",
      topic: saved.entry.topic || saved.entry.title,
      at: new Date().toISOString()
    });
    const updated = await updateUserRecord(user);
    sendJson(response, 200, { savedProject: saved.entry, app: buildAppState(updated) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/training/attempt") {
    const body = await readJsonBody(request);
    const result = evaluateTrainingGroundAttempt(user, body);
    user.progress.missionHistory = user.progress.missionHistory ?? [];
    user.progress.missionHistory.push({
      action: "training-attempt",
      topic: result.topic,
      difficulty: result.difficulty,
      score: result.score,
      status: result.result,
      at: new Date().toISOString()
    });
    await updateUserRecord(user);
    sendJson(response, 200, { result });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/mission/complete") {
    const body = await readJsonBody(request);
    user.progress = completeMissionProgress(user, body.missionId || user.progress.currentMissionId);
    const updated = await updateUserRecord(user);
    sendJson(response, 200, { app: buildAppState(updated) });
    return;
  }

  sendJson(response, 404, { error: "Route not found" });
}

async function handleSignup(body, response) {
  if (!body.name || !body.email || !body.password) {
    sendJson(response, 400, { error: "Name, email, and password are required." });
    return;
  }

  const existing = await findUserByEmail(body.email);
  if (existing) {
    sendJson(response, 409, { error: "An account with this email already exists." });
    return;
  }

  const profile = createLearnerProfile(body);
  const progress = createInitialProgress(profile, body.selectedTrackId);
  const passwordBundle = hashPassword(body.password);
  const user = await createUserRecord(profile, passwordBundle, progress);
  user.auth.providers = user.auth.providers ?? {};
  user.auth.providers.email = user.auth.providers.email ?? {
    linkedAt: new Date().toISOString(),
    mode: "password"
  };
  const updated = await updateUserRecord(user);
  const token = createSessionToken();
  await createSession(updated.id, token);
  sendJson(response, 201, { token, app: buildAppState(updated) });
}

async function handleLogin(body, response) {
  if (!body.email || !body.password) {
    sendJson(response, 400, { error: "Email and password are required." });
    return;
  }

  const user = await findUserByEmail(body.email);
  if (!user || !verifyPassword(body.password, user.auth.salt, user.auth.passwordHash)) {
    sendJson(response, 401, { error: "Invalid email or password." });
    return;
  }

  user.auth.providers = user.auth.providers ?? {};
  user.auth.providers.email = user.auth.providers.email ?? {
    linkedAt: new Date().toISOString(),
    mode: "password"
  };
  const updated = await updateUserRecord(user);

  const token = createSessionToken();
  await createSession(updated.id, token);
  sendJson(response, 200, { token, app: buildAppState(updated) });
}

function buildProviderCapabilities() {
  return [
    { id: "email", status: "active", mode: "password" },
    { id: "phone", status: "active", mode: "otp-demo" },
    ...Array.from(SOCIAL_PROVIDERS).map((provider) => ({
      id: provider,
      status: isOAuthEnabled(provider) ? "oauth-ready" : "quick-login",
      mode: isOAuthEnabled(provider) ? "oauth" : "email-assisted"
    }))
  ];
}

async function handleProviderLogin(body, response) {
  const provider = normalizeProvider(body.provider);
  if (!SOCIAL_PROVIDERS.has(provider)) {
    sendJson(response, 400, { error: "Supported providers are Google, GitHub, and LinkedIn." });
    return;
  }

  const email = String(body.email || "").trim().toLowerCase();
  if (!email) {
    sendJson(response, 400, { error: `Email is required for ${provider} quick login in this build.` });
    return;
  }

  const name = String(body.name || `${provider} learner`).trim();
  const user = await findOrCreateLearnerFromProvider({
    provider,
    email,
    name
  });

  user.auth.providers = user.auth.providers ?? {};
  user.auth.providers[provider] = {
    linkedAt: user.auth.providers[provider]?.linkedAt || new Date().toISOString(),
    mode: isOAuthEnabled(provider) ? "oauth" : "quick-login"
  };

  user.progress.missionHistory = user.progress.missionHistory ?? [];
  user.progress.missionHistory.push({
    action: "provider-login",
    provider,
    at: new Date().toISOString()
  });

  const updated = await updateUserRecord(user);
  await issueSessionForUser(updated, response);
}

async function handleProviderOAuthStart(request, response, url) {
  const provider = normalizeProvider(url.searchParams.get("provider"));
  if (!SOCIAL_PROVIDERS.has(provider)) {
    sendJson(response, 400, { error: "Unknown provider. Choose Google, GitHub, or LinkedIn." });
    return;
  }

  if (!isOAuthEnabled(provider)) {
    sendJson(response, 400, { error: `${provider} OAuth is not configured yet. Use quick login or set provider credentials.` });
    return;
  }

  pruneOAuthStates();
  const oauthConfig = getOAuthConfigForProvider(provider, request);
  const state = createSessionToken();
  oauthStates.set(state, {
    provider,
    redirectUri: oauthConfig.redirectUri,
    createdAt: Date.now(),
    expiresAt: Date.now() + (10 * 60 * 1000)
  });

  const authorizationUrl = buildOAuthAuthorizationUrl(oauthConfig, state);
  sendRedirect(response, authorizationUrl);
}

async function handleProviderOAuthCallback(request, response, url) {
  const provider = parseProviderFromCallbackPath(url.pathname);
  if (!provider || !SOCIAL_PROVIDERS.has(provider)) {
    sendText(response, 400, "Invalid provider callback.");
    return;
  }

  const code = String(url.searchParams.get("code") || "").trim();
  const state = String(url.searchParams.get("state") || "").trim();
  const error = String(url.searchParams.get("error") || "").trim();
  const errorDescription = String(url.searchParams.get("error_description") || "").trim();

  if (error) {
    sendHtml(response, 400, buildOAuthCallbackPage({
      ok: false,
      message: `${capitalize(provider)} OAuth failed: ${error}${errorDescription ? ` (${errorDescription})` : ""}`
    }));
    return;
  }

  if (!code || !state) {
    sendHtml(response, 400, buildOAuthCallbackPage({
      ok: false,
      message: "Missing OAuth code or state. Please try login again."
    }));
    return;
  }

  const stateRecord = oauthStates.get(state);
  oauthStates.delete(state);
  if (!stateRecord || stateRecord.provider !== provider || stateRecord.expiresAt < Date.now()) {
    sendHtml(response, 400, buildOAuthCallbackPage({
      ok: false,
      message: "OAuth state expired or invalid. Please start login again."
    }));
    return;
  }

  if (!isOAuthEnabled(provider)) {
    sendHtml(response, 400, buildOAuthCallbackPage({
      ok: false,
      message: `${capitalize(provider)} OAuth is not configured on this deployment.`
    }));
    return;
  }

  try {
    const oauthConfig = getOAuthConfigForProvider(provider, request);
    const token = await exchangeOAuthCode(provider, code, oauthConfig);
    const profile = await fetchOAuthProfile(provider, token);
    const user = await findOrCreateLearnerFromProvider({
      provider,
      email: profile.email,
      name: profile.name
    });

    user.auth.providers = user.auth.providers ?? {};
    user.auth.providers[provider] = {
      linkedAt: user.auth.providers[provider]?.linkedAt || new Date().toISOString(),
      mode: "oauth",
      profileId: profile.id || ""
    };
    user.progress.missionHistory = user.progress.missionHistory ?? [];
    user.progress.missionHistory.push({
      action: "provider-oauth-login",
      provider,
      at: new Date().toISOString()
    });
    const updated = await updateUserRecord(user);
    const sessionToken = createSessionToken();
    await createSession(updated.id, sessionToken);

    sendHtml(response, 200, buildOAuthCallbackPage({
      ok: true,
      provider,
      token: sessionToken
    }));
  } catch (callbackError) {
    console.error(callbackError);
    sendHtml(response, 500, buildOAuthCallbackPage({
      ok: false,
      message: `${capitalize(provider)} OAuth callback failed. Please use quick login and retry later.`
    }));
  }
}

function isOAuthEnabled(provider) {
  const config = OAUTH_PROVIDER_CONFIG[provider];
  if (!config) {
    return false;
  }

  const explicitEnabled = process.env[config.enabledKey] === "true";
  return explicitEnabled || isOAuthConfigured(provider);
}

function isOAuthConfigured(provider) {
  const config = OAUTH_PROVIDER_CONFIG[provider];
  if (!config) {
    return false;
  }

  return Boolean(process.env[config.clientIdKey] && process.env[config.clientSecretKey]);
}

function getOAuthConfigForProvider(provider, request) {
  const providerConfig = OAUTH_PROVIDER_CONFIG[provider];
  const clientId = process.env[providerConfig.clientIdKey] || "";
  const clientSecret = process.env[providerConfig.clientSecretKey] || "";
  if (!clientId || !clientSecret) {
    throw new Error(`Missing OAuth credentials for ${provider}.`);
  }

  const baseUrl = String(process.env.LUMINA_OAUTH_BASE_URL || buildPublicBaseUrl(request)).replace(/\/+$/, "");
  return {
    provider,
    clientId,
    clientSecret,
    authorizationEndpoint: providerConfig.authorizationEndpoint,
    tokenEndpoint: providerConfig.tokenEndpoint,
    scopes: providerConfig.scopes,
    redirectUri: `${baseUrl}/api/auth/provider/callback/${provider}`
  };
}

function buildPublicBaseUrl(request) {
  const forwardedProto = String(request.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const proto = forwardedProto || "http";
  const host = request.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

function buildOAuthAuthorizationUrl(config, state) {
  const search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state
  });

  if (config.provider === "google") {
    search.set("access_type", "online");
    search.set("prompt", "consent");
  }

  return `${config.authorizationEndpoint}?${search.toString()}`;
}

async function exchangeOAuthCode(provider, code, config) {
  const payload = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code"
  });

  const tokenResponse = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(provider === "github" ? { Accept: "application/json" } : {})
    },
    body: payload.toString()
  });

  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new Error(`OAuth token exchange failed for ${provider}`);
  }

  return tokenPayload.access_token;
}

async function fetchOAuthProfile(provider, accessToken) {
  if (provider === "google") {
    const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.email) {
      throw new Error("Google user profile lookup failed.");
    }
    return {
      id: payload.sub || "",
      email: String(payload.email).toLowerCase(),
      name: payload.name || payload.given_name || "Google learner"
    };
  }

  if (provider === "github") {
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "LuminaLearnAI/1.0"
      }
    });
    const userPayload = await userResponse.json().catch(() => ({}));
    if (!userResponse.ok) {
      throw new Error("GitHub user profile lookup failed.");
    }

    let email = String(userPayload.email || "").toLowerCase();
    if (!email) {
      const emailResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "LuminaLearnAI/1.0"
        }
      });
      const emailPayload = await emailResponse.json().catch(() => []);
      if (emailResponse.ok && Array.isArray(emailPayload)) {
        const preferred = emailPayload.find((item) => item.primary && item.verified) || emailPayload.find((item) => item.verified) || emailPayload[0];
        email = String(preferred?.email || "").toLowerCase();
      }
    }

    if (!email) {
      throw new Error("GitHub email unavailable.");
    }

    return {
      id: String(userPayload.id || ""),
      email,
      name: userPayload.name || userPayload.login || "GitHub learner"
    };
  }

  const linkedInResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const linkedInPayload = await linkedInResponse.json().catch(() => ({}));
  if (!linkedInResponse.ok || !linkedInPayload.email) {
    throw new Error("LinkedIn user profile lookup failed.");
  }

  return {
    id: linkedInPayload.sub || "",
    email: String(linkedInPayload.email).toLowerCase(),
    name: linkedInPayload.name || linkedInPayload.given_name || "LinkedIn learner"
  };
}

function pruneOAuthStates() {
  const now = Date.now();
  for (const [state, record] of oauthStates.entries()) {
    if (record.expiresAt < now) {
      oauthStates.delete(state);
    }
  }
}

function parseProviderFromCallbackPath(pathname) {
  const segments = String(pathname || "").split("/").filter(Boolean);
  return normalizeProvider(segments[4] || "");
}

function buildOAuthCallbackPage({ ok, provider = "", token = "", message = "" }) {
  if (!ok) {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Lumina OAuth Error</title>
    <style>
      body { font-family: Segoe UI, sans-serif; background: #081020; color: #f4f8ff; display: grid; place-items: center; min-height: 100vh; margin: 0; }
      .card { width: min(680px, calc(100% - 32px)); border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; padding: 24px; background: rgba(255,255,255,0.06); }
      h1 { margin: 0 0 10px; font-size: 1.2rem; }
      p { margin: 0; color: #b8c7e7; line-height: 1.6; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>OAuth login failed</h1>
      <p>${escapeHtml(message || "Login could not be completed.")}</p>
    </div>
  </body>
</html>`;
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Lumina OAuth Success</title>
  </head>
  <body>
    <script>
      localStorage.setItem("lumina-token", ${JSON.stringify(token)});
      localStorage.setItem("codesprout-token", ${JSON.stringify(token)});
      localStorage.setItem("nexus-token", ${JSON.stringify(token)});
      window.location.replace("/dashboard.html?oauth=${encodeURIComponent(provider)}");
    </script>
  </body>
</html>`;
}

async function handlePhoneRequest(body, response) {
  const phone = sanitizePhone(body.phone);
  if (!phone) {
    sendJson(response, 400, { error: "A valid phone number is required." });
    return;
  }

  const challengeId = createSessionToken().slice(0, 16);
  const code = String(Math.floor(100000 + (Math.random() * 900000)));
  phoneChallenges.set(challengeId, {
    phone,
    code,
    expiresAt: Date.now() + (5 * 60 * 1000)
  });

  sendJson(response, 200, {
    challengeId,
    delivery: "simulated",
    code,
    message: "Use this code to verify phone login. In production this should be delivered via SMS."
  });
}

async function handlePhoneVerify(body, response) {
  const challengeId = String(body.challengeId || "").trim();
  const code = String(body.code || "").trim();
  const challenge = phoneChallenges.get(challengeId);

  if (!challenge) {
    sendJson(response, 400, { error: "Phone challenge not found. Request a new code." });
    return;
  }

  if (challenge.expiresAt < Date.now()) {
    phoneChallenges.delete(challengeId);
    sendJson(response, 400, { error: "Phone code expired. Request a new code." });
    return;
  }

  if (challenge.code !== code) {
    sendJson(response, 401, { error: "Invalid phone verification code." });
    return;
  }

  phoneChallenges.delete(challengeId);
  const providerEmail = `phone-${challenge.phone}@lumina-phone.local`;
  const name = String(body.name || `Phone learner ${challenge.phone.slice(-4)}`).trim();
  const user = await findOrCreateLearnerFromProvider({
    provider: "phone",
    email: providerEmail,
    name
  });

  user.auth.providers = user.auth.providers ?? {};
  user.auth.providers.phone = {
    linkedAt: user.auth.providers.phone?.linkedAt || new Date().toISOString(),
    mode: "otp-demo",
    phone: challenge.phone
  };
  user.progress.missionHistory = user.progress.missionHistory ?? [];
  user.progress.missionHistory.push({
    action: "phone-login",
    at: new Date().toISOString()
  });

  const updated = await updateUserRecord(user);
  await issueSessionForUser(updated, response);
}

async function issueSessionForUser(user, response) {
  const token = createSessionToken();
  await createSession(user.id, token);
  sendJson(response, 200, { token, app: buildAppState(user) });
}

async function findOrCreateLearnerFromProvider({ provider, email, name }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    return existing;
  }

  const profileSeed = createDefaultProfileInput({ name, email, provider });
  const profile = createLearnerProfile(profileSeed);
  const progress = createInitialProgress(profile, profileSeed.selectedTrackId);
  const passwordBundle = hashPassword(createSessionToken());
  return createUserRecord(profile, passwordBundle, progress);
}

function createDefaultProfileInput({ name, email, provider }) {
  return {
    name,
    email,
    courseInterests: "General learning, visual study",
    goals: "Understand hard topics quickly",
    knownTopics: "",
    projectHistory: "",
    learningUniverse: "programming-systems",
    animationMode: "cinematic",
    primaryLanguage: "python",
    bridgeLanguage: "java",
    currentConfidence: "tentative",
    preferredIntensity: "steady",
    captionsEnabled: "true",
    voiceEnabled: "false",
    futureRole: "Backend Engineer",
    primaryDomain: "ai-automation",
    selectedTrackId: "aether-ops",
    communicationStyle: "English",
    sceneStyle: "holo-grid",
    uiTheme: "nexus-command",
    roleLens: "backend",
    focusStyle: "visual-first",
    learningModes: ["cinematic", "builder"],
    provider
  };
}

function normalizeProvider(value) {
  return String(value || "").trim().toLowerCase();
}

function sanitizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return "";
  }
  return digits;
}

function createVideoJob(user, body) {
  const sourceExperience = body.sourceExperience || {};
  const topic = String(sourceExperience.topic || body.topic || "Untitled topic").trim();
  const chapters = sourceExperience.animatedLesson?.chapters || [];
  const now = new Date().toISOString();
  const jobId = `video-${createSessionToken().slice(0, 12)}`;

  return {
    id: jobId,
    topic,
    title: `${topic} cinematic render`,
    status: "queued",
    stage: "Queueing storyboard assets",
    progress: 6,
    sceneCount: chapters.length || 5,
    renderStyle: String(body.renderStyle || "cinematic"),
    sourceFetchMode: sourceExperience.source?.fetchMode || "fetched",
    estimatedSeconds: 18,
    sourceSnapshot: {
      chapters: chapters.slice(0, 8).map((chapter, index) => ({
        index: index + 1,
        title: chapter.title,
        summary: chapter.summary,
        cameraMove: chapter.cameraMove
      })),
      embedUrl: sourceExperience.source?.embedUrl || "",
      sourceUrl: sourceExperience.source?.url || "",
      examples: (sourceExperience.realWorldExamples || []).slice(0, 3)
    },
    output: null,
    createdAt: now,
    updatedAt: now
  };
}

function dedupeVideoJobs(items) {
  const seen = new Set();
  return [...items].reverse().filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  }).reverse();
}

function scheduleVideoJobProgress(userId, jobId) {
  const stageMs = Math.max(80, Number(process.env.LUMINA_VIDEO_STAGE_MS || 1300));
  const timeline = [
    { delayMs: stageMs, status: "scripting", stage: "Writing narration and pacing cues", progress: 24 },
    { delayMs: stageMs, status: "storyboarding", stage: "Building cinematic scene timeline", progress: 48 },
    { delayMs: stageMs, status: "compositing", stage: "Compositing visual layers and transitions", progress: 72 },
    { delayMs: stageMs, status: "encoding", stage: "Encoding lesson cut and captions", progress: 92 },
    { delayMs: Math.round(stageMs * 0.7), status: "completed", stage: "Render complete", progress: 100 }
  ];

  const existing = videoJobTimers.get(jobId);
  if (existing) {
    existing.forEach((timerId) => clearTimeout(timerId));
  }

  const timers = [];
  let cumulativeDelay = 0;
  timeline.forEach((step) => {
    cumulativeDelay += step.delayMs;
    const timerId = setTimeout(async () => {
      await updateVideoJobRecord(userId, jobId, step);
      if (step.status === "completed") {
        const pendingTimers = videoJobTimers.get(jobId) || [];
        pendingTimers.forEach((id) => clearTimeout(id));
        videoJobTimers.delete(jobId);
      }
    }, cumulativeDelay);
    timers.push(timerId);
  });

  videoJobTimers.set(jobId, timers);
}

async function updateVideoJobRecord(userId, jobId, step) {
  try {
    const user = await findUserById(userId);
    if (!user) {
      return;
    }

    user.progress.videoJobs = user.progress.videoJobs ?? [];
    const index = user.progress.videoJobs.findIndex((item) => item.id === jobId);
    if (index === -1) {
      return;
    }

    const current = user.progress.videoJobs[index];
    const updatedAt = new Date().toISOString();
    const next = {
      ...current,
      status: step.status,
      stage: step.stage,
      progress: step.progress,
      updatedAt
    };

    if (step.status === "completed") {
      next.completedAt = updatedAt;
      next.output = {
        ready: true,
        durationLabel: `${Math.max(4, current.sceneCount)} min cinematic study cut`,
        previewType: current.sourceSnapshot.embedUrl ? "embedded-source" : "storyboard-cinematic",
        previewUrl: current.sourceSnapshot.embedUrl || "",
        manifestVersion: "v1",
        downloadPath: `/api/video-jobs/${current.id}/manifest`
      };
      user.progress.missionHistory = user.progress.missionHistory ?? [];
      user.progress.missionHistory.push({
        action: "video-render-complete",
        topic: current.topic,
        at: updatedAt
      });
    }

    user.progress.videoJobs[index] = next;
    await updateUserRecord(user);
  } catch (error) {
    console.error("Video job progression failed", error);
  }
}

function buildVideoManifest(job) {
  return {
    version: "1.0.0",
    jobId: job.id,
    title: job.title,
    topic: job.topic,
    renderStyle: job.renderStyle,
    sourceFetchMode: job.sourceFetchMode,
    generatedAt: job.completedAt || job.updatedAt,
    stages: {
      status: job.status,
      stage: job.stage,
      progress: job.progress
    },
    playback: job.output ?? {
      ready: false
    },
    scenes: job.sourceSnapshot?.chapters ?? [],
    examples: job.sourceSnapshot?.examples ?? [],
    source: {
      sourceUrl: job.sourceSnapshot?.sourceUrl || "",
      embedUrl: job.sourceSnapshot?.embedUrl || ""
    }
  };
}

async function getAuthenticatedUser(request, response) {
  const token = getBearerToken(request);

  if (!token) {
    sendJson(response, 401, { error: "Missing authentication token." });
    return null;
  }

  const user = await findUserBySessionToken(token);
  if (!user) {
    sendJson(response, 401, { error: "Invalid or expired session." });
    return null;
  }

  return user;
}

function getBearerToken(request) {
  const header = request.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim();
}

async function serveStatic(requestPath, response) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const resolvedPath = path.join(publicDir, safePath);
  const normalizedPath = path.normalize(resolvedPath);

  if (!normalizedPath.startsWith(publicDir)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(normalizedPath);
    const extension = path.extname(normalizedPath);
    response.writeHead(200, { "Content-Type": mimeTypes[extension] || "application/octet-stream" });
    response.end(file);
  } catch {
    sendText(response, 404, "Not found");
  }
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function sendHtml(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "text/html; charset=utf-8" });
  response.end(payload);
}

function sendRedirect(response, targetUrl) {
  response.writeHead(302, { Location: targetUrl });
  response.end();
}

function sendText(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(payload);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
