import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../lib/auth.js";
import {
  advanceSceneTimeline,
  buildAppState,
  createInitialProgress,
  createLearnerProfile,
  evaluateTrainingGroundAttempt,
  evaluateWorkspaceSubmission,
  generateMentorResponse,
  generateTrainingGroundPack,
  generateUniversalCoursePlan,
  getMeta,
  getPortfolioEvidence,
  reviewMissionExplanation
} from "../lib/engine.js";

function createUserRecord(overrides = {}) {
  const profile = createLearnerProfile({
    name: "Akshya",
    email: "akshya@example.com",
    knownTopics: "frontend, html, css, javascript",
    goals: "placement, backend, aws",
    projectHistory: "portfolio app",
    currentConfidence: "tentative",
    primaryDomain: "ai-automation",
    learningModes: ["cinematic", "builder", "mentor"],
    futureRole: "Backend Engineer",
    primaryLanguage: "typescript",
    bridgeLanguage: "python",
    ...overrides
  });

  return {
    id: "user-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    auth: {
      name: profile.name,
      email: profile.email,
      salt: "salt",
      passwordHash: "hash"
    },
    profile,
    progress: createInitialProgress(profile, "aether-ops")
  };
}

test("password hashing and verification work together", () => {
  const bundle = hashPassword("super-secret");
  assert.equal(verifyPassword("super-secret", bundle.salt, bundle.hash), true);
  assert.equal(verifyPassword("wrong-secret", bundle.salt, bundle.hash), false);
});

test("buildAppState exposes workflow, security, and portfolio data", () => {
  const user = createUserRecord();
  const app = buildAppState(user);

  assert.equal(app.currentTrack.id, "aether-ops");
  assert.equal(app.workspace.mission.id, "mission-auth-gate");
  assert.equal(app.securityBoard.authModel.length > 0, true);
  assert.equal(app.portfolio.resumeBullets.length, 3);
  assert.equal(app.missionSelector.length, 4);
  assert.equal(Boolean(app.commandCenter.productName), true);
  assert.equal(Array.isArray(app.sceneTimeline.sequence), true);
  assert.equal(Boolean(app.missionTicket.objective), true);
  assert.equal(Boolean(app.careerVault.title), true);
});

test("evaluateWorkspaceSubmission returns readiness and guidance", () => {
  const user = createUserRecord();
  const evaluation = evaluateWorkspaceSubmission(user, {
    missionId: "mission-request-router",
    implementationPlan: "Validate request input, route it to the correct handler, and return a status-safe response.",
    codeAttempt: "function routeRequest(payload) { const validated = validatePayload(payload); return sendResponse(validated); }",
    notes: "I still need a cleaner error path."
  });

  assert.equal(typeof evaluation.score, "number");
  assert.equal(evaluation.nextMoves.length, 3);
  assert.equal(evaluation.readiness.length > 0, true);
  assert.equal(typeof evaluation.ticketStatus, "string");
  assert.equal(Array.isArray(evaluation.visualReplay.timeline), true);
  assert.equal(Array.isArray(evaluation.acceptanceChecks), true);
});

test("reviewMissionExplanation scores ownership pillars", () => {
  const user = createUserRecord();
  const review = reviewMissionExplanation(user, {
    missionId: "mission-auth-gate",
    explanation: "I built the validation and session flow because the user needs a trusted sign-up process. The request is validated, a session is created, and invalid input is blocked.",
    codeAttempt: "function handleSignup(request) { /* validate, create session, return response */ }"
  });

  assert.equal(review.pillars.length, 4);
  assert.equal(review.score >= 50, true);
  assert.equal(review.interviewBullets.length, 3);
  assert.equal(Array.isArray(review.debriefSignals), true);
});

test("scene progression advances through cinematic states", () => {
  const user = createUserRecord();
  const first = advanceSceneTimeline(user, { missionId: "mission-auth-gate" });
  const second = advanceSceneTimeline({ ...user, progress: first.progress }, { missionId: "mission-auth-gate" });

  assert.equal(first.state.currentState, "route");
  assert.equal(second.state.currentState, "compute");
  assert.equal(second.state.completedStates.includes("trigger"), true);
});

test("mentor guidance includes no-full-solution guardrail", () => {
  const user = createUserRecord();
  const mentor = generateMentorResponse(user, {
    missionId: "mission-auth-gate",
    issueType: "stuck",
    lane: "cinematic",
    attemptSummary: "I cannot structure the validation flow."
  });

  assert.equal(typeof mentor.codePolicy, "string");
  assert.equal(mentor.codePolicy.toLowerCase().includes("never"), true);
  assert.equal(Array.isArray(mentor.hintLadder), true);
});

test("portfolio evidence packet returns ownership summary", () => {
  const user = createUserRecord();
  user.progress.completedMissionIds.push("mission-auth-gate");
  const evidence = getPortfolioEvidence(user);

  assert.equal(evidence.activeTrack.id, "aether-ops");
  assert.equal(Array.isArray(evidence.interviewPacket.keyClaims), true);
  assert.equal(Array.isArray(evidence.contributionSummary.completedMissions), true);
});

test("metadata includes NEXUS ui packs and role lenses", () => {
  const meta = getMeta();
  assert.equal(Array.isArray(meta.uiThemePack), true);
  assert.equal(Array.isArray(meta.sceneStyles), true);
  assert.equal(Array.isArray(meta.roleLenses), true);
  assert.equal(Array.isArray(meta.learningUniverses), true);
  assert.equal(Array.isArray(meta.animationModes), true);
  assert.equal(typeof meta.operationVocabulary, "object");
});

test("universal course plan supports non-programming topics with side artifact path", () => {
  const user = createUserRecord({
    goals: "english fluency, communication"
  });
  const plan = generateUniversalCoursePlan(user, {
    topic: "English Speaking",
    outcome: "Confident interview communication",
    learningUniverse: "language-mastery",
    animationMode: "anime",
    level: "Momentum"
  });

  assert.equal(plan.topic, "English Speaking");
  assert.equal(plan.learningUniverse.id, "language-mastery");
  assert.equal(plan.animationMode.id, "anime");
  assert.equal(Array.isArray(plan.storyEpisodes), true);
  assert.equal(plan.storyEpisodes.length >= 5, true);
  assert.equal(Array.isArray(plan.sideProject.deliverables), true);
});

test("training ground pack includes lecture + easy/hard tasks", () => {
  const user = createUserRecord({
    courseInterests: "python classes"
  });
  const pack = generateTrainingGroundPack(user, {
    topic: "Python Classes",
    animationMode: "anime",
    learningUniverse: "programming-systems"
  });

  assert.equal(pack.topic, "Python Classes");
  assert.equal(Boolean(pack.studyMaterial.lectureVideo.searchUrl), true);
  assert.equal(Array.isArray(pack.studyMaterial.visualScenes), true);
  assert.equal(Boolean(pack.tasks.easy.timeLimitSec), true);
  assert.equal(Boolean(pack.tasks.hard.timeLimitSec), true);
});

test("training attempt returns pass/fail with animation payload", () => {
  const user = createUserRecord();
  const result = evaluateTrainingGroundAttempt(user, {
    topic: "Python Classes",
    difficulty: "easy",
    answer: "Python classes have objects, methods, definition, example, and flow.",
    expectedKeywords: ["python", "classes", "example", "flow", "definition"]
  });

  assert.equal(typeof result.score, "number");
  assert.equal(["pass", "retry"].includes(result.result), true);
  assert.equal(Boolean(result.animation.style), true);
});
