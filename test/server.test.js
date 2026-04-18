import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { promises as fs } from "node:fs";
import { createServer } from "../server.js";

async function startIsolatedServer() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-server-test-"));
  const dataFile = path.join(tempDir, "users.json");
  await fs.writeFile(dataFile, JSON.stringify({ users: [], sessions: [] }, null, 2));
  process.env.NEXUS_DATA_FILE = dataFile;
  process.env.LUMINA_VIDEO_STAGE_MS = "90";

  const server = createServer();
  server.listen(0);
  await once(server, "listening");

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    dataFile,
    async close() {
      server.close();
      await once(server, "close");
      delete process.env.NEXUS_DATA_FILE;
      delete process.env.LUMINA_VIDEO_STAGE_MS;
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  };
}

async function startMockSourceServer() {
  const server = http.createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(`
      <!doctype html>
      <html>
        <head>
          <title>How HTTP APIs Work in Real Products</title>
          <meta name="description" content="A deep lesson about requests, responses, validation, and real product flows." />
          <meta property="og:image" content="/hero.png" />
        </head>
        <body>
          <p>APIs help products move information between clients and servers in a structured way.</p>
          <p>Every request should carry clear intent, validation, and safe error handling.</p>
          <p>Real systems depend on readable contracts, useful status codes, and predictable responses.</p>
        </body>
      </html>
    `);
  });

  server.listen(0);
  await once(server, "listening");
  const address = server.address();

  return {
    url: `http://127.0.0.1:${address.port}/lesson.html`,
    async close() {
      server.close();
      await once(server, "close");
    }
  };
}

async function postJson(url, body, token = "") {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  return {
    status: response.status,
    json: await response.json()
  };
}

async function getJson(url, token = "") {
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  return {
    status: response.status,
    json: await response.json()
  };
}

async function getRaw(url, token = "") {
  const response = await fetch(url, {
    redirect: "manual",
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  return {
    status: response.status,
    headers: response.headers,
    text: await response.text()
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSignupPayload(name, email) {
  return {
    name,
    email,
    password: "super-secret",
    courseInterests: "Python, English",
    goals: "confidence, job, projects",
    learningUniverse: "programming-systems",
    animationMode: "cinematic",
    primaryLanguage: "typescript",
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
    bridgeLanguage: "python",
    knownTopics: "",
    projectHistory: ""
  };
}

test("auth, sessions, and per-user stored progress stay isolated", async () => {
  const harness = await startIsolatedServer();

  try {
    const alphaSignup = await postJson(
      `${harness.baseUrl}/api/auth/signup`,
      buildSignupPayload("Alpha", "alpha@example.com")
    );
    const betaSignup = await postJson(
      `${harness.baseUrl}/api/auth/signup`,
      buildSignupPayload("Beta", "beta@example.com")
    );

    assert.equal(alphaSignup.status, 201);
    assert.equal(betaSignup.status, 201);
    assert.equal(alphaSignup.json.app.user.name, "Alpha");
    assert.equal(betaSignup.json.app.user.name, "Beta");

    const alphaToken = alphaSignup.json.token;
    const betaToken = betaSignup.json.token;

    const alphaPlan = await postJson(
      `${harness.baseUrl}/api/course/plan`,
      {
        topic: "Python Classes",
        outcome: "Build a simple project",
        learningUniverse: "programming-systems",
        animationMode: "cartoon",
        level: "Momentum"
      },
      alphaToken
    );

    assert.equal(alphaPlan.status, 200);
    assert.equal(alphaPlan.json.plan.topic, "Python Classes");

    const betaApp = await getJson(`${harness.baseUrl}/api/app`, betaToken);
    assert.equal(betaApp.status, 200);
    assert.equal(betaApp.json.app.user.name, "Beta");
    assert.equal(betaApp.json.app.activity.missionHistory.length, 0);

    const store = JSON.parse(await fs.readFile(harness.dataFile, "utf8"));
    const alphaRecord = store.users.find((user) => user.auth.email === "alpha@example.com");
    const betaRecord = store.users.find((user) => user.auth.email === "beta@example.com");

    assert.equal(alphaRecord.progress.missionHistory.length, 1);
    assert.equal(alphaRecord.progress.missionHistory[0].action, "course-plan-generated");
    assert.equal(betaRecord.progress.missionHistory.length, 0);
    assert.equal(alphaRecord.auth.passwordHash === "super-secret", false);

    const logout = await postJson(`${harness.baseUrl}/api/auth/logout`, {}, alphaToken);
    assert.equal(logout.status, 200);

    const alphaAfterLogout = await getJson(`${harness.baseUrl}/api/app`, alphaToken);
    assert.equal(alphaAfterLogout.status, 401);
    assert.equal(alphaAfterLogout.json.error, "Invalid or expired session.");
  } finally {
    await harness.close();
  }
});

test("language selection, saved lessons, and saved projects persist per user", async () => {
  const harness = await startIsolatedServer();

  try {
    const signup = await postJson(
      `${harness.baseUrl}/api/auth/signup`,
      buildSignupPayload("Gamma", "gamma@example.com")
    );

    assert.equal(signup.status, 201);
    const token = signup.json.token;

    const updatedPrefs = await postJson(
      `${harness.baseUrl}/api/preferences/update`,
      {
        primaryLanguage: "java",
        bridgeLanguage: "c"
      },
      token
    );

    assert.equal(updatedPrefs.status, 200);
    assert.equal(updatedPrefs.json.app.profile.primaryLanguage.id, "java");

    const lessonPlan = await postJson(
      `${harness.baseUrl}/api/course/plan`,
      {
        topic: "Java Classes",
        outcome: "Understand objects clearly",
        learningUniverse: "programming-systems",
        animationMode: "cinematic",
        level: "Momentum"
      },
      token
    );

    assert.equal(lessonPlan.status, 200);

    const savedLesson = await postJson(
      `${harness.baseUrl}/api/library/lesson/save`,
      {
        source: "story-plan",
        plan: lessonPlan.json.plan
      },
      token
    );

    assert.equal(savedLesson.status, 200);
    assert.equal(savedLesson.json.app.savedLibrary.lessons.length, 1);

    const project = await postJson(
      `${harness.baseUrl}/api/project/blueprint`,
      {
        topic: "Java Classes",
        goal: "Build a small library app",
        scope: "mini"
      },
      token
    );

    assert.equal(project.status, 200);

    const savedProject = await postJson(
      `${harness.baseUrl}/api/library/project/save`,
      {
        project: project.json.project
      },
      token
    );

    assert.equal(savedProject.status, 200);
    assert.equal(savedProject.json.app.savedLibrary.projects.length, 1);

    const store = JSON.parse(await fs.readFile(harness.dataFile, "utf8"));
    const gammaRecord = store.users.find((user) => user.auth.email === "gamma@example.com");

    assert.equal(gammaRecord.profile.primaryLanguage.id, "java");
    assert.equal(gammaRecord.progress.savedLessons.length, 1);
    assert.equal(gammaRecord.progress.savedProjects.length, 1);
  } finally {
    await harness.close();
  }
});

test("source analysis fetches a URL and builds a saveable cinematic lesson", async () => {
  const harness = await startIsolatedServer();
  const sourceHarness = await startMockSourceServer();

  try {
    const signup = await postJson(
      `${harness.baseUrl}/api/auth/signup`,
      buildSignupPayload("Delta", "delta@example.com")
    );

    assert.equal(signup.status, 201);
    const token = signup.json.token;

    const sourceResponse = await postJson(
      `${harness.baseUrl}/api/source/analyze`,
      {
        sourceUrl: sourceHarness.url,
        focus: "Understand APIs deeply",
        animationMode: "cinematic",
        depth: "deep",
        learningUniverse: "programming-systems"
      },
      token
    );

    assert.equal(sourceResponse.status, 200);
    assert.equal(sourceResponse.json.sourceExperience.topic, "How HTTP APIs Work in Real Products");
    assert.equal(Array.isArray(sourceResponse.json.sourceExperience.deepNotes), true);
    assert.equal(sourceResponse.json.sourceExperience.deepNotes.length >= 3, true);
    assert.equal(Array.isArray(sourceResponse.json.sourceExperience.kidsMode.simpleLines), true);
    assert.equal(sourceResponse.json.sourceExperience.kidsMode.simpleLines.length >= 4, true);
    assert.equal(Array.isArray(sourceResponse.json.sourceExperience.cinematicVideoPlan.scenes), true);
    assert.equal(sourceResponse.json.sourceExperience.cinematicVideoPlan.scenes.length >= 4, true);

    const savedLesson = await postJson(
      `${harness.baseUrl}/api/library/lesson/save`,
      {
        source: "source-studio",
        plan: sourceResponse.json.sourceExperience
      },
      token
    );

    assert.equal(savedLesson.status, 200);
    assert.equal(savedLesson.json.app.savedLibrary.lessons.length, 1);
    assert.equal(savedLesson.json.app.savedLibrary.lessons[0].topic, "How HTTP APIs Work in Real Products");
  } finally {
    await sourceHarness.close();
    await harness.close();
  }
});

test("source analysis falls back gracefully when a source URL is unreachable", async () => {
  const harness = await startIsolatedServer();

  try {
    const signup = await postJson(
      `${harness.baseUrl}/api/auth/signup`,
      buildSignupPayload("Echo", "echo@example.com")
    );

    assert.equal(signup.status, 201);
    const token = signup.json.token;

    const sourceResponse = await postJson(
      `${harness.baseUrl}/api/source/analyze`,
      {
        sourceUrl: "https://127.0.0.1:1/unreachable",
        focus: "Understand this topic with fallback context",
        animationMode: "cinematic",
        depth: "deep",
        learningUniverse: "programming-systems"
      },
      token
    );

    assert.equal(sourceResponse.status, 200);
    assert.equal(sourceResponse.json.sourceExperience.source.fetchMode, "fallback");
    assert.equal(Array.isArray(sourceResponse.json.sourceExperience.kidsMode.storyCards), true);
    assert.equal(Boolean(sourceResponse.json.sourceExperience.animatedLesson.title), true);
    assert.equal(Boolean(sourceResponse.json.sourceExperience.flowDiagram.title), true);
    assert.equal(Boolean(sourceResponse.json.sourceExperience.cheatSheet.headline), true);
  } finally {
    await harness.close();
  }
});

test("youtube fallback keeps a meaningful topic label when fetch is blocked", async () => {
  const harness = await startIsolatedServer();

  try {
    const signup = await postJson(
      `${harness.baseUrl}/api/auth/signup`,
      buildSignupPayload("YtFallback", "yt-fallback@example.com")
    );

    assert.equal(signup.status, 201);
    const token = signup.json.token;

    const sourceResponse = await postJson(
      `${harness.baseUrl}/api/source/analyze`,
      {
        sourceUrl: "https://www.youtube.com/watch?v=iCfCRaraLgU",
        focus: "Teach this to class 1 student",
        animationMode: "cinematic",
        depth: "deep"
      },
      token
    );

    assert.equal(sourceResponse.status, 200);
    const topic = String(sourceResponse.json.sourceExperience.topic || "").toLowerCase();
    assert.equal(topic.includes("untitled"), false);
    assert.equal(topic.length > 3, true);
  } finally {
    await harness.close();
  }
});

test("oauth-ready providers expose redirect start route when credentials are configured", async () => {
  const harness = await startIsolatedServer();
  const previousClientId = process.env.LUMINA_GOOGLE_CLIENT_ID;
  const previousClientSecret = process.env.LUMINA_GOOGLE_CLIENT_SECRET;
  const previousOAuthBase = process.env.LUMINA_OAUTH_BASE_URL;
  const previousEnabled = process.env.LUMINA_GOOGLE_OAUTH_ENABLED;

  try {
    process.env.LUMINA_GOOGLE_CLIENT_ID = "google-client-id";
    process.env.LUMINA_GOOGLE_CLIENT_SECRET = "google-client-secret";
    process.env.LUMINA_OAUTH_BASE_URL = harness.baseUrl;
    process.env.LUMINA_GOOGLE_OAUTH_ENABLED = "true";

    const providers = await getJson(`${harness.baseUrl}/api/auth/providers`);
    const googleProvider = providers.json.providers.find((item) => item.id === "google");

    assert.equal(providers.status, 200);
    assert.equal(googleProvider.status, "oauth-ready");

    const start = await getRaw(`${harness.baseUrl}/api/auth/provider/start?provider=google`);
    const location = start.headers.get("location") || "";

    assert.equal(start.status, 302);
    assert.equal(location.includes("accounts.google.com"), true);
    assert.equal(location.includes("state="), true);
  } finally {
    if (previousClientId === undefined) {
      delete process.env.LUMINA_GOOGLE_CLIENT_ID;
    } else {
      process.env.LUMINA_GOOGLE_CLIENT_ID = previousClientId;
    }
    if (previousClientSecret === undefined) {
      delete process.env.LUMINA_GOOGLE_CLIENT_SECRET;
    } else {
      process.env.LUMINA_GOOGLE_CLIENT_SECRET = previousClientSecret;
    }
    if (previousOAuthBase === undefined) {
      delete process.env.LUMINA_OAUTH_BASE_URL;
    } else {
      process.env.LUMINA_OAUTH_BASE_URL = previousOAuthBase;
    }
    if (previousEnabled === undefined) {
      delete process.env.LUMINA_GOOGLE_OAUTH_ENABLED;
    } else {
      process.env.LUMINA_GOOGLE_OAUTH_ENABLED = previousEnabled;
    }
    await harness.close();
  }
});

test("provider quick login supports social providers without password setup", async () => {
  const harness = await startIsolatedServer();

  try {
    const login = await postJson(
      `${harness.baseUrl}/api/auth/provider/login`,
      {
        provider: "google",
        email: "provider-user@example.com",
        name: "Provider User"
      }
    );

    assert.equal(login.status, 200);
    assert.equal(Boolean(login.json.token), true);
    assert.equal(login.json.app.user.email, "provider-user@example.com");
    assert.equal(login.json.app.user.providers.includes("google"), true);

    const app = await getJson(`${harness.baseUrl}/api/app`, login.json.token);
    assert.equal(app.status, 200);
    assert.equal(app.json.app.user.name, "Provider User");
  } finally {
    await harness.close();
  }
});

test("phone login flow issues code and verifies challenge", async () => {
  const harness = await startIsolatedServer();

  try {
    const challenge = await postJson(
      `${harness.baseUrl}/api/auth/phone/request`,
      { phone: "+91 9876543210" }
    );

    assert.equal(challenge.status, 200);
    assert.equal(Boolean(challenge.json.challengeId), true);
    assert.equal(Boolean(challenge.json.code), true);

    const verify = await postJson(
      `${harness.baseUrl}/api/auth/phone/verify`,
      {
        challengeId: challenge.json.challengeId,
        code: challenge.json.code,
        name: "Phone User"
      }
    );

    assert.equal(verify.status, 200);
    assert.equal(Boolean(verify.json.token), true);
    assert.equal(verify.json.app.user.providers.includes("phone"), true);
  } finally {
    await harness.close();
  }
});

test("video render jobs progress asynchronously and expose a manifest", async () => {
  const harness = await startIsolatedServer();

  try {
    const signup = await postJson(
      `${harness.baseUrl}/api/auth/signup`,
      buildSignupPayload("Video User", "video@example.com")
    );
    assert.equal(signup.status, 201);
    const token = signup.json.token;

    const sourceResponse = await postJson(
      `${harness.baseUrl}/api/source/analyze`,
      {
        sourceUrl: "https://127.0.0.1:1/unreachable-video",
        focus: "Build an animated lesson quickly",
        animationMode: "cinematic",
        depth: "deep"
      },
      token
    );
    assert.equal(sourceResponse.status, 200);

    const created = await postJson(
      `${harness.baseUrl}/api/video-jobs/create`,
      {
        topic: sourceResponse.json.sourceExperience.topic,
        sourceExperience: sourceResponse.json.sourceExperience,
        renderStyle: "cinematic"
      },
      token
    );

    assert.equal(created.status, 201);
    assert.equal(created.json.job.status, "queued");

    await sleep(900);

    const job = await getJson(`${harness.baseUrl}/api/video-jobs/${created.json.job.id}`, token);
    assert.equal(job.status, 200);
    assert.equal(job.json.job.status, "completed");

    const manifest = await getJson(`${harness.baseUrl}/api/video-jobs/${created.json.job.id}/manifest`, token);
    assert.equal(manifest.status, 200);
    assert.equal(manifest.json.manifest.jobId, created.json.job.id);
    assert.equal(Array.isArray(manifest.json.manifest.scenes), true);
  } finally {
    await harness.close();
  }
});
