import {
  animationModes,
  communicationStyles,
  domains,
  learningUniverses,
  learningModes,
  operationVocabulary,
  roleLenses,
  roles,
  sceneStyles,
  supportLanguages,
  tracks,
  uiThemePack
} from "./catalog.js";

const levelBands = [
  { id: "ignite", label: "Ignite", minScore: 0, maxScore: 3, tone: "Keep the product advanced but reduce cognitive load with strong visual anchors." },
  { id: "momentum", label: "Momentum", minScore: 4, maxScore: 7, tone: "Use guided tickets and frequent checkpoints while increasing code ownership." },
  { id: "orbit", label: "Orbit", minScore: 8, maxScore: 11, tone: "Push architecture reasoning, debugging, and explain-back fluency." },
  { id: "launch", label: "Launch", minScore: 12, maxScore: Infinity, tone: "Treat the learner like a rising engineer with product and platform ownership." }
];

const skillWeights = {
  frontend: 2,
  html: 1,
  css: 1,
  javascript: 2,
  typescript: 2,
  react: 2,
  node: 2,
  python: 2,
  api: 2,
  database: 2,
  sql: 2,
  aws: 3,
  deploy: 2,
  dsa: 2,
  auth: 1
};

const conceptKeywords = {
  functions: ["function", "handler", "input", "output", "return", "step"],
  apis: ["endpoint", "route", "request", "response", "status", "payload"],
  classes: ["class", "constructor", "object", "instance", "method"],
  databases: ["record", "schema", "table", "persist", "store", "query"],
  queues: ["queue", "job", "worker", "retry", "priority", "status"],
  aws: ["s3", "lambda", "alb", "load balancer", "cloudfront", "rds", "region"],
  deployment: ["deploy", "rollback", "release", "environment", "monitor"],
  validation: ["validate", "guard", "check", "sanitize"],
  graphs: ["node", "edge", "dependency", "graph", "topology"]
};

const sceneStateOrder = ["trigger", "route", "compute", "persist", "async", "deploy"];

export function getMeta() {
  return {
    domains,
    roles,
    learningModes,
    learningUniverses,
    animationModes,
    supportLanguages,
    communicationStyles,
    uiThemePack,
    sceneStyles,
    roleLenses,
    operationVocabulary,
    tracks: tracks.map((track) => ({
      id: track.id,
      name: track.name,
      summary: track.summary,
      companyAngle: track.companyAngle,
      concepts: track.concepts
    }))
  };
}

export function createLearnerProfile(input) {
  const normalizedSkills = normalizeList(input.knownTopics);
  const normalizedGoals = normalizeList(input.goals);
  const normalizedProjects = normalizeList(input.projectHistory);
  const score = computeScore(normalizedSkills, normalizedProjects, input.currentConfidence);
  const level = levelBands.find((band) => score >= band.minScore && score <= band.maxScore) ?? levelBands[0];
  const primaryDomain = domains.find((item) => item.id === input.primaryDomain) ?? domains[0];
  const preferredModes = normalizeList(input.learningModes);
  const communicationStyle = communicationStyles.includes(input.communicationStyle) ? input.communicationStyle : "English";
  const codeConfidence = input.currentConfidence || "tentative";
  const roleFocus = roles.includes(input.futureRole) ? input.futureRole : roles[1];
  const primaryLanguage = resolvePrimaryLanguage(input.primaryLanguage, normalizedSkills);
  const bridgeLanguage = resolveBridgeLanguage(input.bridgeLanguage, primaryLanguage.id);
  const preferredIntensity = ["steady", "accelerated", "intense"].includes(input.preferredIntensity)
    ? input.preferredIntensity
    : "steady";
  const preferredSceneStyle = sceneStyles.some((style) => style.id === input.sceneStyle) ? input.sceneStyle : "holo-grid";
  const captionsEnabled = input.captionsEnabled !== "false";
  const voiceEnabled = input.voiceEnabled === "true";
  const uiTheme = uiThemePack.some((item) => item.id === input.uiTheme) ? input.uiTheme : "nexus-command";
  const selectedRoleLens = roleLenses.some((lens) => lens.id === input.roleLens) ? input.roleLens : "backend";
  const learningUniverse = learningUniverses.some((item) => item.id === input.learningUniverse)
    ? input.learningUniverse
    : "programming-systems";
  const animationPreference = animationModes.some((item) => item.id === input.animationMode)
    ? input.animationMode
    : "cinematic";
  const courseInterests = normalizeList(input.courseInterests || input.goals);

  return {
    name: input.name,
    email: String(input.email || "").trim().toLowerCase(),
    existingSkills: normalizedSkills,
    goals: normalizedGoals,
    projectHistory: normalizedProjects,
    primaryDomain,
    preferredModes,
    communicationStyle,
    codeConfidence,
    roleFocus,
    level,
    score,
    projectPace: input.projectPace || "steady",
    focusStyle: input.focusStyle || "visual-first",
    preferredIntensity,
    preferredSceneStyle,
    captionsEnabled,
    voiceEnabled,
    uiTheme,
    selectedRoleLens,
    learningUniverse,
    animationPreference,
    courseInterests,
    primaryLanguage,
    bridgeLanguage
  };
}

export function createInitialProgress(profile, selectedTrackId) {
  const track = getTrack(selectedTrackId);
  return {
    selectedTrackId: track.id,
    currentMissionId: track.missions[0].id,
    completedMissionIds: [],
    drafts: {},
    mentorHistory: [],
    reviewHistory: [],
    debriefHistory: [],
    missionHistory: [],
    architectureNotes: [],
    savedLessons: [],
    savedProjects: [],
    videoJobs: [],
    unlockedModes: Array.from(new Set(["cinematic", "builder", ...profile.preferredModes])),
    sceneProgress: {
      [track.missions[0].id]: createSceneProgressState()
    },
    roleLensId: profile.selectedRoleLens || "backend"
  };
}

export function buildAppState(userRecord) {
  const profile = userRecord.profile;
  const baseTrack = getTrack(userRecord.progress?.selectedTrackId);
  const progress = ensureProgressModel(userRecord.progress, profile, baseTrack);
  const currentTrack = getTrack(progress.selectedTrackId);
  const currentMission = getMission(currentTrack, progress.currentMissionId) ?? currentTrack.missions[0];
  const trackDeck = rankTracks(profile).map((track) => ({
    id: track.id,
    name: track.name,
    summary: track.summary,
    companyAngle: track.companyAngle,
    score: track.score,
    recommended: track.id === currentTrack.id
  }));
  const completed = progress.completedMissionIds.length;
  const total = currentTrack.missions.length;
  const progressPercent = Math.round((completed / total) * 100);
  const sceneTimeline = buildSceneTimeline(profile, currentTrack, currentMission, progress);
  const missionTicket = buildMissionTicket(profile, currentTrack, currentMission, progress);
  const selectedRoleLens = roleLenses.find((lens) => lens.id === progress.roleLensId) ?? roleLenses[0];
  const dashboard = buildDashboard(profile, currentTrack, currentMission, progress);

  return {
    user: {
      id: userRecord.id,
      name: profile.name,
      email: profile.email,
      providers: Object.keys(userRecord.auth?.providers ?? { email: true })
    },
    profile,
    dashboard,
    commandCenter: buildCommandCenter(profile, currentTrack, currentMission, progress),
    overview: {
      headline: `${currentTrack.name} is your active operation arc.`,
      subhead: localize(
        profile,
        `${currentTrack.companyAngle} NEXUS is tuned for ${profile.level.label} growth with ${profile.primaryLanguage.label} as the build lane and ${profile.bridgeLanguage.label} as transfer lane.`,
        `${currentTrack.companyAngle} NEXUS ${profile.level.label} growth ke liye tuned hai, ${profile.primaryLanguage.label} build lane aur ${profile.bridgeLanguage.label} transfer lane ke saath.`
      ),
      progressPercent,
      completed,
      total,
      nextMilestone: `${currentMission.title} is the current objective in Mission Bridge.`
    },
    trackDeck,
    missionSelector: currentTrack.missions.map((mission) => ({
      id: mission.id,
      title: mission.title,
      phase: mission.phase,
      completed: progress.completedMissionIds.includes(mission.id),
      active: mission.id === currentMission.id
    })),
    currentTrack: {
      id: currentTrack.id,
      name: currentTrack.name,
      summary: currentTrack.summary,
      concepts: currentTrack.concepts,
      architectureNodes: currentTrack.architectureNodes
    },
    operationVocabulary,
    sceneTimeline,
    missionTicket,
    roleLens: {
      selected: selectedRoleLens,
      options: roleLenses,
      overlays: buildRoleLensOverlay(selectedRoleLens, currentMission)
    },
    learningStudio: buildLearningStudio(profile, currentTrack, currentMission, progress),
    sceneBoard: buildSceneBoard(profile, currentTrack, currentMission),
    workspace: buildMissionWorkspace(profile, currentTrack, currentMission, progress),
    mentorKit: buildMentorKit(profile, currentTrack, currentMission, progress),
    reviewLab: buildReviewLab(profile, currentTrack, currentMission, progress),
    portfolio: buildPortfolioSummary(userRecord, currentTrack, currentMission),
    debrief: buildDebriefBoard(profile, currentMission, progress),
    careerVault: buildCareerVault(userRecord, currentTrack, currentMission),
    architectureBoard: buildArchitectureBoard(profile, currentTrack, currentMission),
    securityBoard: {
      authModel: "Session-backed auth with hashed passwords and protected API routes.",
      isolation: "Each operator has isolated drafts, simulation history, and debrief records.",
      trafficModel: "The architecture board shows load-balanced edge flow with separated app, worker, and persistence zones.",
      trustRule: "Mentor help is structured to increase ownership instead of encouraging copy-paste dependency."
    },
    activity: {
      missionHistory: progress.missionHistory.slice(-5).reverse(),
      reviewHistory: progress.reviewHistory.slice(-5).reverse(),
      mentorHistory: progress.mentorHistory.slice(-5).reverse(),
      debriefHistory: (progress.debriefHistory ?? []).slice(-5).reverse()
    },
    videoStudio: {
      jobs: (progress.videoJobs ?? []).slice(-8).reverse(),
      activeCount: (progress.videoJobs ?? []).filter((job) => !job.completedAt && job.status !== "completed" && job.status !== "failed").length
    },
    savedLibrary: buildSavedLibrary(progress),
    uiThemePack,
    sceneStyles
  };
}

export function advanceSceneTimeline(userRecord, input) {
  const track = getTrack(userRecord.progress?.selectedTrackId);
  const missionId = input.missionId || userRecord.progress?.currentMissionId || track.missions[0].id;
  const current = userRecord.progress?.sceneProgress?.[missionId] ?? createSceneProgressState();
  const currentIndex = sceneStateOrder.indexOf(current.currentState);
  const nextIndex = input.reset ? 0 : Math.min(sceneStateOrder.length - 1, currentIndex + 1);
  const nextState = sceneStateOrder[nextIndex];
  const completedStates = input.reset
    ? [nextState]
    : Array.from(new Set([...current.completedStates, nextState]));

  const updatedSceneProgress = {
    ...(userRecord.progress.sceneProgress ?? {}),
    [missionId]: {
      currentState: nextState,
      completedStates,
      phase:
        nextState === "trigger" || nextState === "route"
          ? "micro-cinematic"
          : nextState === "compute" || nextState === "persist"
            ? "mini-implementation"
            : "mission-application",
      updatedAt: new Date().toISOString()
    }
  };

  return {
    missionId,
    state: updatedSceneProgress[missionId],
    progress: {
      ...userRecord.progress,
      sceneProgress: updatedSceneProgress
    }
  };
}

export function generateMentorResponse(userRecord, input) {
  const profile = userRecord.profile;
  const progress = userRecord.progress;
  const track = getTrack(progress.selectedTrackId);
  const mission = getMission(track, input.missionId) ?? track.missions[0];
  const lessonTopic = String(input.topic || mission.title).trim();
  const analysis = analyzeAttempt(input.codeAttempt, input.implementationPlan, mission.concepts);
  const lane = input.lane || "cinematic";
  const laneMap = buildLearningLanes(profile, track, mission);
  const directWarning = localize(
    profile,
    "The mentor should coach the learner toward the solution and only reveal structure, not the final full code.",
    "Mentor ko learner ko solution tak coach karna hai, final full code seedha nahi dena."
  );

  return {
    mission: {
      id: mission.id,
      title: lessonTopic,
      objective: input.attemptSummary || mission.objective
    },
    selectedLane: lane,
    laneSummary: laneMap.find((item) => item.id === lane)?.description ?? laneMap[0].description,
    stance: localize(
      profile,
      "You need the next bridge, not the finished bridge.",
      "Tumhe next bridge chahiye, pura finished bridge nahi."
    ),
    sceneBeats: [
      `Scene 1: Imagine ${lessonTopic} as a visual flow instead of raw syntax.`,
      `Scene 2: The code you write is the control logic that decides how ${lessonTopic} behaves step by step.`,
      `Scene 3: If you can explain the flow, ${lessonTopic} is becoming yours instead of something copied.`
    ],
    attemptSignals: analysis.signals,
    hintLadder: [
      localize(profile, "Write the smallest useful function name first.", "Sabse chhota useful function naam pehle likho."),
      localize(profile, "Define the data entering this mission and the result leaving it.", "Is mission mein kya data enter kar raha hai aur kya result bahar aa raha hai, woh define karo."),
      localize(profile, "Map the code to the scene: entry gate, decision point, stored state, outgoing response.", "Code ko scene se map karo: entry gate, decision point, stored state, outgoing response."),
      input.attemptSummary
        ? localize(profile, `Reduce your next step to this unit: ${input.attemptSummary}`, `Next step ko itne chhote unit mein lao: ${input.attemptSummary}`)
        : localize(profile, "If you are blank, write pseudocode before real code.", "Agar blank feel ho raha hai toh real code se pehle pseudocode likho.")
    ],
    structuralBlueprint: buildStructuralBlueprint(profile, mission, analysis),
    explainBackPrompts: [
      "What problem does this feature solve in the product?",
      "What would fail if this step were missing?",
      "How would you explain your role in this mission during an interview?"
    ],
    guardrail: directWarning,
    codePolicy: "Guided-only assistance: strategy + partial structure + diagnostics, never full copy-ready solution."
  };
}

export function evaluateWorkspaceSubmission(userRecord, input) {
  const profile = userRecord.profile;
  const track = getTrack(userRecord.progress.selectedTrackId);
  const mission = getMission(track, input.missionId) ?? track.missions[0];
  const analysis = analyzeAttempt(input.codeAttempt, input.implementationPlan, mission.concepts);
  const planScore = scoreTextDepth(input.implementationPlan, 18, 50);
  const noteScore = scoreTextDepth(input.notes, 10, 30);
  const score = clamp(Math.round((analysis.coverageScore * 0.55) + (planScore * 0.35) + (noteScore * 0.1)), 20, 96);
  const ownershipPhase = score >= 80 ? "mostly-independent" : score >= 60 ? "partial" : "guided";
  const ticketStatus = score >= 78 ? "deploy-ready" : score >= 55 ? "stabilizing" : "in-progress";

  return {
    missionId: mission.id,
    score,
    readiness: score >= 78 ? "mission-ready" : score >= 55 ? "growing" : "early-build",
    ticketStatus,
    ownershipPhase,
    acceptanceChecks: buildAcceptanceChecks(mission, analysis, score),
    strengths: analysis.strengths,
    gaps: analysis.gaps,
    nextMoves: [
      `Tie your implementation back to ${mission.companyTicket.toLowerCase()}.`,
      "State the inputs, outputs, and failure case in plain English before the next code pass.",
      `Use ${userRecord.profile.primaryLanguage.label} for the core implementation and keep the structure easy to explain.`
    ],
    ownershipSignal: buildOwnershipSignal(profile, score),
    visualReplay: buildVisualReplay(mission, analysis, score)
  };
}

export function reviewMissionExplanation(userRecord, input) {
  const profile = userRecord.profile;
  const track = getTrack(userRecord.progress.selectedTrackId);
  const mission = getMission(track, input.missionId) ?? track.missions[0];
  const lessonTopic = String(input.topic || mission.title).trim();
  const combined = `${input.explanation || ""} ${input.codeAttempt || ""}`.toLowerCase();
  const pillars = [
    { id: "purpose", label: "Purpose", pass: includesAny(combined, ["because", "so that", "to allow", "so the user"]) },
    { id: "flow", label: "Flow", pass: includesAny(combined, ["request", "response", "queue", "store", "validate", "route"]) },
    { id: "ownership", label: "Ownership", pass: includesAny(combined, ["i built", "i handled", "my part", "i owned"]) },
    { id: "risk", label: "Risk", pass: includesAny(combined, ["if", "failure", "retry", "error", "invalid", "rollback"]) }
  ];
  const score = Math.round((pillars.filter((item) => item.pass).length / pillars.length) * 100);

  return {
    missionId: mission.id,
    topic: lessonTopic,
    score,
    status: score >= 75 ? "owner-ready" : score >= 50 ? "needs-clarity" : "too-shallow",
    pillars,
    debriefSignals: [
      score >= 75 ? "Ownership signal: strong" : "Ownership signal: building",
      pillars.some((item) => item.id === "risk" && item.pass) ? "Risk articulation present" : "Add failure and rollback articulation",
      pillars.some((item) => item.id === "flow" && item.pass) ? "System flow articulation present" : "Need clearer request-to-result narration"
    ],
    coachResponse: localize(
      profile,
      score >= 75
        ? "You sound like the owner of the feature. Keep sharpening tradeoffs and failure handling."
        : "Your explanation needs a stronger flow story. Explain what enters the system, what logic runs, and what result leaves.",
      score >= 75
        ? "Ab tum feature ke owner ki tarah sound kar rahe ho. Bas tradeoffs aur failure handling aur sharp karo."
        : "Explanation mein flow story aur strong chahiye. Batao system mein kya enter hota hai, beech mein kya logic chalta hai, aur bahar kya result aata hai."
    ),
    interviewBullets: [
      `I studied and implemented ${lessonTopic.toLowerCase()} in a guided build flow.`,
      `My responsibility was to explain the logic clearly and apply it in code.`,
      `I focused on flow, ownership, and one real use case for ${lessonTopic.toLowerCase()}.`
    ],
    evidenceSummary: {
      mission: lessonTopic,
      roleArea: mission.roleArea,
      debriefLevel: score >= 75 ? "owner" : score >= 50 ? "contributor" : "observer"
    }
  };
}

export function getPortfolioEvidence(userRecord) {
  const track = getTrack(userRecord.progress.selectedTrackId);
  const mission = getMission(track, userRecord.progress.currentMissionId) ?? track.missions[0];
  const completedMissions = track.missions.filter((item) => userRecord.progress.completedMissionIds.includes(item.id));
  const latestDebrief = (userRecord.progress.debriefHistory ?? userRecord.progress.reviewHistory ?? []).slice(-1)[0] ?? null;
  const roleLens = roleLenses.find((lens) => lens.id === (userRecord.progress.roleLensId || userRecord.profile.selectedRoleLens)) ?? roleLenses[0];

  return {
    operator: {
      id: userRecord.id,
      name: userRecord.profile.name,
      roleTarget: userRecord.profile.roleFocus
    },
    activeTrack: {
      id: track.id,
      name: track.name,
      companyAngle: track.companyAngle
    },
    contributionSummary: {
      completedMissions: completedMissions.map((item) => ({
        id: item.id,
        title: item.title,
        roleArea: item.roleArea,
        outcomes: item.outcomes
      })),
      currentMission: {
        id: mission.id,
        title: mission.title,
        objective: mission.objective
      }
    },
    architectureNarrative: {
      nodes: track.architectureNodes,
      explanation: `Designed ${track.name} around edge routing, core services, async execution, and durable state boundaries.`
    },
    interviewPacket: {
      roleLens: roleLens.label,
      keyClaims: [
        `Owned ${mission.roleArea.toLowerCase()} responsibilities within ${track.name}.`,
        `Implemented and explained resilient flow for ${mission.companyTicket.toLowerCase()}.`,
        `Mapped product behavior to cloud architecture and failure handling.`
      ],
      latestDebrief: latestDebrief
        ? {
            score: latestDebrief.score,
            status: latestDebrief.status || "recorded",
            at: latestDebrief.at || latestDebrief.completedAt || null
          }
        : null
    },
    generatedAt: new Date().toISOString()
  };
}

export function generateUniversalCoursePlan(userRecord, input) {
  const profile = userRecord.profile;
  const topic = String(input.topic || input.subject || "General Mastery").trim();
  const outcome = String(input.outcome || "real-world execution").trim();
  const level = String(input.level || profile.level.label || "Momentum").trim();
  const animationMode = animationModes.find((item) => item.id === (input.animationMode || profile.animationPreference))
    ?? animationModes[0];
  const universe = learningUniverses.find((item) => item.id === (input.learningUniverse || profile.learningUniverse))
    ?? learningUniverses[0];

  const storyEpisodes = [
    {
      id: `${slugify(topic)}-world-setup`,
      order: 1,
      title: `Episode 1: World Setup for ${topic}`,
      objective: `Understand core vocabulary and the story context through ${animationMode.label} scenes.`,
      animation: animationMode.tone
    },
    {
      id: `${slugify(topic)}-core-mechanics`,
      order: 2,
      title: `Episode 2: Core Mechanics`,
      objective: `Break ${topic} into cause-effect flow and visual memory anchors.`,
      animation: "State transitions with story-driven events."
    },
    {
      id: `${slugify(topic)}-guided-action`,
      order: 3,
      title: `Episode 3: Guided Action`,
      objective: `Execute a small applied task with hints and explain-back checkpoints.`,
      animation: "Interactive scene overlays and mission prompts."
    },
    {
      id: `${slugify(topic)}-build-challenge`,
      order: 4,
      title: `Episode 4: Build Challenge`,
      objective: `Apply topic knowledge to an outcome-focused challenge.`,
      animation: "High-intensity simulation of real-world pressure."
    },
    {
      id: `${slugify(topic)}-mastery-debrief`,
      order: 5,
      title: `Episode 5: Mastery Debrief`,
      objective: `Explain the concept like an owner and convert it into portfolio evidence.`,
      animation: "Cinematic recap + visual replay."
    }
  ];

  const deepDiveNotes = [
    {
      title: "Foundation",
      bullets: [
        `Start with the core meaning of ${topic} before any memorization.`,
        `Keep the outcome in mind: ${outcome}.`,
        `Use visual anchors so the concept stays easy to recall later.`
      ]
    },
    {
      title: "Mechanics",
      bullets: [
        `Break ${topic} into trigger, process, and result.`,
        `Notice where learners usually get confused and slow down there.`,
        `Convert the idea into one simple example and one realistic example.`
      ]
    },
    {
      title: "Ownership",
      bullets: [
        `Explain ${topic} back in your own words once the lesson ends.`,
        `Apply it in a task or project so it stops feeling like theory only.`,
        `Keep one interview-ready or portfolio-ready explanation sentence.`
      ]
    }
  ];

  const realWorldExamples = [
    `Beginner example: show ${topic} with one very small daily-life analogy.`,
    `Professional example: connect ${topic} to a realistic work or product problem.`,
    `Failure example: show what goes wrong when ${topic} is misunderstood or skipped.`
  ];

  const lessonFlow = [
    {
      title: "Watch the idea",
      prompt: `See ${topic} in one simple visual story before trying to remember rules.`
    },
    {
      title: "Name the moving parts",
      prompt: `Break ${topic} into clear steps so the flow becomes easy to explain.`
    },
    {
      title: "Try a guided task",
      prompt: "Use one small task to turn the concept into action."
    },
    {
      title: "Use it in a build",
      prompt: `Connect ${topic} to ${outcome} so the lesson feels useful.`
    }
  ];

  const microWins = [
    `You can explain ${topic} in simple words.`,
    `You can give one beginner example and one realistic example for ${topic}.`,
    `You can say where ${topic} fits inside a real project or workflow.`
  ];

  const checkpoints = [
    {
      title: "Simple check",
      prompt: `Could you explain ${topic} to a beginner without confusing jargon?`
    },
    {
      title: "Flow check",
      prompt: `Can you describe the trigger, process, and result for ${topic}?`
    },
    {
      title: "Ownership check",
      prompt: `Could you use ${topic} in a small build and explain why it is there?`
    }
  ];

  const canBuildProject = universe.id === "programming-systems"
    || universe.id === "business-creator"
    || universe.id === "exam-career";

  const sideProject = canBuildProject
    ? {
        enabled: true,
        title: `${topic} Applied Project`,
        deliverables: [
          "Mini milestone build",
          "Capstone output",
          "Portfolio evidence writeup",
          "Interview/demo explanation script"
        ],
        resumeLine: `Built an outcome-driven ${topic} project with animation-first learning workflow and explainable implementation.`
      }
    : {
        enabled: true,
        title: `${topic} Applied Artifact`,
        deliverables: [
          "Concept map artifact",
          "Case-study or simulation report",
          "Explain-back recording",
          "Progress proof for portfolio"
        ],
        resumeLine: `Completed animation-driven mastery arc for ${topic} with applied artifact and explainable outcomes.`
      };

  return {
    topic,
    outcome,
    level,
    learningUniverse: universe,
    animationMode,
    storyEpisodes,
    lessonFlow,
    deepDiveNotes,
    realWorldExamples,
    microWins,
    checkpoints,
    sideProject,
    generatedAt: new Date().toISOString()
  };
}

export function generateTrainingGroundPack(userRecord, input) {
  const profile = userRecord.profile;
  const topic = String(input.topic || profile.courseInterests?.[0] || "general topic").trim();
  const level = String(input.level || profile.level.label || "Momentum").trim();
  const animationMode = animationModes.find((item) => item.id === (input.animationMode || profile.animationPreference))
    ?? animationModes[0];
  const universe = learningUniverses.find((item) => item.id === (input.learningUniverse || profile.learningUniverse))
    ?? learningUniverses[0];
  const sceneStudio = buildTrainingSceneStudio(topic, animationMode, universe);

  const keywords = buildTopicKeywords(topic);
  const lectureEmbedUrl = resolveLectureEmbedUrl(input.videoUrl, topic);
  const lectureSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${topic} animated lecture`)}`;

  return {
    topic,
    level,
    animationMode,
    learningUniverse: universe,
    sceneStudio,
    studyMaterial: {
      title: `${topic} - Easy animated lesson`,
      simpleSummary: `Watch the cinematic concept story of ${topic}, then clear one easy and one hard mission.`,
      lectureVideo: {
        embedUrl: lectureEmbedUrl,
        searchUrl: lectureSearchUrl,
        note: lectureEmbedUrl
          ? "Lecture video is ready below."
          : "Add your own YouTube video link, or use the search button to find one quickly."
      },
      visualScenes: [
        {
          title: "Scene 1 - What is it?",
          caption: `${topic} in one clear definition with simple visual metaphor.`,
          vibe: "chakra-spark",
          lead: "Sensei",
          cameraMove: "Slow cinematic push-in"
        },
        {
          title: "Scene 2 - How it works",
          caption: `Step-by-step flow of ${topic} with animated transitions.`,
          vibe: "blue-wave",
          lead: "Hero",
          cameraMove: "Orbit pan with motion trails"
        },
        {
          title: "Scene 3 - Real use",
          caption: `Where ${topic} is used in real world and why it matters.`,
          vibe: "sunrise-pulse",
          lead: "Rival",
          cameraMove: "Impact cut + wide reveal"
        },
        {
          title: "Scene 4 - Common mistake",
          caption: `What usually goes wrong when ${topic} is misunderstood.`,
          vibe: "ember-rise",
          lead: "Guide",
          cameraMove: "Sharp cut into highlighted weak points"
        },
        {
          title: "Scene 5 - Mastery frame",
          caption: `How to explain ${topic} clearly and confidently after learning it.`,
          vibe: "teal-pulse",
          lead: "Builder",
          cameraMove: "Wide reveal with floating summary cards"
        }
      ],
      easyConcepts: [
        `Definition: ${topic} means the core idea and purpose in simple words.`,
        `Flow: understand input -> process -> output for ${topic}.`,
        "Memory trick: connect the idea to one daily life example."
      ],
      cheatSheet: [
        {
          title: "In one line",
          answer: `${topic} is easiest to remember when you describe what goes in, what happens, and what comes out.`
        },
        {
          title: "Why it matters",
          answer: `${topic} helps you control logic clearly instead of guessing.`
        },
        {
          title: "Interview answer",
          answer: `I use ${topic} to make behavior clearer, safer, and easier to explain.`
        }
      ],
      deepConcepts: [
        {
          title: "Core understanding",
          bullets: [
            `Explain ${topic} without jargon first.`,
            "Keep one beginner-friendly example ready.",
            "Notice the smallest unit of logic or meaning."
          ]
        },
        {
          title: "System thinking",
          bullets: [
            `Map ${topic} into a full flow instead of isolated pieces.`,
            "Look for trigger, action, and outcome.",
            "Name one risk, mistake, or edge case."
          ]
        },
        {
          title: "Explain-back",
          bullets: [
            `Describe why ${topic} matters in real work or study.`,
            "Speak it once in simple words and once in more technical words.",
            "Use your own example so the idea becomes yours."
          ]
        }
      ],
      realWorldExamples: [
        {
          title: "Everyday example",
          summary: `See ${topic} in a simple daily action so the concept stops feeling abstract.`
        },
        {
          title: "Work example",
          summary: `Imagine using ${topic} in a real team, product, or backend flow.`
        },
        {
          title: "Failure example",
          summary: `Notice the bug, confusion, or broken result that happens when ${topic} is used wrongly.`
        }
      ],
      mistakeMap: [
        `Common mistake: learning words around ${topic} without understanding the flow.`,
        `Common mistake: copying examples without knowing why each step exists.`,
        `Common mistake: skipping the real-world reason for using ${topic}.`
      ],
      miniBuild: {
        title: `${topic} mini build`,
        steps: [
          "Pick one tiny scenario that clearly needs the concept.",
          `Apply ${topic} in the smallest useful version first.`,
          "Check the output and explain what changed.",
          "Write one improvement you would make next."
        ],
        successSignal: `You should be able to explain the result of your ${topic} mini build in under one minute.`
      }
    },
    tasks: {
      easy: {
        id: "easy",
        title: `Easy mission - ${topic}`,
        instruction: `Write 3 simple points: what ${topic} is, one real example, and one key step in the flow.`,
        timeLimitSec: 180,
        hint: "Keep language simple. Clarity is more important than long answers.",
        expectedKeywords: Array.from(new Set([topic.toLowerCase(), ...keywords.slice(0, 4), "example", "flow"]))
      },
      hard: {
        id: "hard",
        title: `Hard mission - ${topic}`,
        instruction: `Explain how you would apply ${topic} in a realistic scenario, including one possible problem and solution.`,
        timeLimitSec: 360,
        hint: "Include scenario + challenge + fix.",
        expectedKeywords: Array.from(new Set([topic.toLowerCase(), ...keywords.slice(0, 6), "problem", "solution", "result"]))
      }
    },
    outputAnimations: {
      success: {
        theme: "rasen-win",
        headline: "Great work! Mission clear.",
        sequence: [
          "Hero lands with chakra streak.",
          "Concept seal lights up in the sky.",
          "Sensei confirms mission complete.",
          "A holographic summary locks the lesson into memory."
        ]
      },
      failure: {
        theme: "smoke-retry",
        headline: "Almost there. Train once more.",
        sequence: [
          "Shadow smoke covers the arena.",
          "Rival marks weak concept points.",
          "Sensei opens a focused retry plan.",
          "The scene rewinds and highlights where understanding broke."
        ]
      }
    },
    generatedAt: new Date().toISOString()
  };
}

export function generateProjectBlueprint(userRecord, input) {
  const profile = userRecord.profile;
  const progress = ensureProgressModel(userRecord.progress, profile, getTrack(userRecord.progress?.selectedTrackId));
  const activeTrack = getTrack(progress.selectedTrackId);
  const topic = String(input.topic || input.title || progress.savedLessons?.slice(-1)[0]?.topic || activeTrack.name).trim();
  const goal = String(input.goal || input.outcome || "Build something real and easy to explain").trim();
  const scope = input.scope === "capstone" ? "capstone" : input.scope === "mini" ? "mini" : "medium";
  const complexityMap = {
    mini: "small and finishable in 1-2 sessions",
    medium: "portfolio-friendly with 3-5 features",
    capstone: "deeper build with clear feature ownership"
  };
  const featurePool = [
    `Guided onboarding for ${topic}`,
    `${topic} dashboard with live status cards`,
    "History and saved progress per user",
    "Explain-back review area",
    "Shareable result summary",
    "Simple admin or coach tools",
    "Source-to-story lesson converter",
    "Resume-ready evidence packet export"
  ];

  return {
    id: buildLibraryId("project", topic),
    title: `${titleCase(topic)} Project`,
    topic,
    goal,
    scope,
    complexity: complexityMap[scope],
    stack: [
      `${profile.primaryLanguage.label} for the main implementation lane`,
      "Node server for API routes",
      "Per-user persistence with protected sessions",
      "Static SPA frontend with visual scenes"
    ],
    problemStatement: `Learners need a real product around ${topic} that feels interesting, saves progress, and can be explained clearly later.`,
    userStory: `As a learner, I want to use ${topic} inside a real flow so I feel I am building something useful instead of only watching lessons.`,
    features: featurePool.slice(0, scope === "mini" ? 3 : scope === "medium" ? 4 : 6),
    milestones: [
      "Milestone 1: working onboarding and topic entry flow",
      "Milestone 2: core topic interaction or processing logic",
      "Milestone 3: saved progress and history",
      scope === "capstone" ? "Milestone 4: polish, debrief, and showcase export" : "Milestone 4: final demo and explanation",
      scope === "capstone" ? "Milestone 5: architecture summary and resume-ready proof" : "Milestone 5: portfolio summary and talking points"
    ],
    architecture: {
      client: "Interactive frontend with guided steps and instant feedback",
      server: "Topic orchestration, evaluation, and project-saving routes",
      persistence: "Per-user saved lessons, project plans, and session-backed app state"
    },
    interviewAngles: [
      `I built a ${scope} project around ${topic} so I could apply the concept in a real user flow.`,
      "I handled saved progress, API behavior, and explainable feature boundaries.",
      "I can explain both the user value and the technical flow.",
      `I can connect ${topic} to real-world examples, user needs, and system design choices.`
    ],
    resumeBullets: [
      `Built a guided learning or utility experience around ${topic}.`,
      "Implemented saved progress, structured lessons, and explain-back support.",
      "Created a project that can be explained clearly in interviews or portfolio reviews."
    ],
    generatedAt: new Date().toISOString()
  };
}

export function createSavedLessonEntry(plan, source = "lesson-plan") {
  return {
    id: buildLibraryId("lesson", plan.topic),
    source,
    topic: plan.topic,
    outcome: plan.outcome || plan.studyMaterial?.simpleSummary || "Understand the topic clearly",
    animationMode: plan.animationMode?.label || titleCase(plan.animationMode?.id || "visual"),
    learningUniverse: plan.learningUniverse?.label || "Programming & Systems",
    summary: plan.storyEpisodes?.[0]?.objective || plan.studyMaterial?.simpleSummary || "",
    steps: plan.storyEpisodes?.length || plan.studyMaterial?.visualScenes?.length || 0,
    createdAt: new Date().toISOString()
  };
}

export function saveLessonToProgress(userRecord, input) {
  const progress = ensureProgressModel(structuredClone(userRecord.progress), userRecord.profile, getTrack(userRecord.progress?.selectedTrackId));
  const entry = createSavedLessonEntry(input.plan, input.source);
  progress.savedLessons = dedupeLibraryEntries([...(progress.savedLessons ?? []), entry]);
  return {
    entry,
    progress
  };
}

export function saveProjectToProgress(userRecord, input) {
  const progress = ensureProgressModel(structuredClone(userRecord.progress), userRecord.profile, getTrack(userRecord.progress?.selectedTrackId));
  const project = {
    ...input.project,
    id: input.project.id || buildLibraryId("project", input.project.topic || input.project.title || "project"),
    createdAt: input.project.createdAt || new Date().toISOString()
  };
  progress.savedProjects = dedupeLibraryEntries([...(progress.savedProjects ?? []), project]);
  return {
    entry: project,
    progress
  };
}

export function evaluateTrainingGroundAttempt(userRecord, input) {
  const topic = String(input.topic || "topic").trim();
  const difficulty = input.difficulty === "hard" ? "hard" : "easy";
  const answer = String(input.answer || "").trim();
  const expectedKeywords = normalizeList(input.expectedKeywords || "");
  const defaultKeywords = buildTopicKeywords(topic);
  const sourceKeywords = expectedKeywords.length ? expectedKeywords : defaultKeywords;
  const text = answer.toLowerCase();
  const matchedKeywords = sourceKeywords.filter((keyword) => text.includes(keyword));
  const coverage = sourceKeywords.length
    ? Math.round((matchedKeywords.length / sourceKeywords.length) * 100)
    : 0;
  const depthBonus = difficulty === "hard" ? scoreTextDepth(answer, 60, 180) : scoreTextDepth(answer, 25, 90);
  const score = clamp(Math.round((coverage * 0.7) + (depthBonus * 0.3)), 0, 100);
  const isPass = score >= (difficulty === "hard" ? 62 : 52);

  const feedback = isPass
    ? `Nice! Your ${difficulty} answer shows clear understanding of ${topic}.`
    : `Good attempt. Add clearer flow, one real example, and stronger problem-solution explanation.`;

  return {
    topic,
    difficulty,
    score,
    result: isPass ? "pass" : "retry",
    matchedKeywords,
    feedback,
    animation: {
      style: isPass ? "rasen-win" : "smoke-retry",
      message: isPass
        ? "Victory animation: chakra burst and mission complete."
        : "Retry animation: shadow smoke, then power-up to try again.",
      sequence: isPass
        ? [
            "Opening burst: hero chakra ring expands.",
            "Mid beat: topic glyph stabilizes in the background.",
            "Final beat: sensei approval with rank-up sparkle."
          ]
        : [
            "Opening beat: smoke wave marks missing parts.",
            "Mid beat: rival challenge panel highlights gaps.",
            "Final beat: reset pulse invites one more attempt."
          ]
    }
  };
}

function buildTrainingSceneStudio(topic, animationMode, universe) {
  const presetByMode = {
    cinematic: {
      palette: "Amber Sky x Cobalt Energy",
      ambience: "Low wind, soft drums, cinematic bass pulse",
      lens: "Wide-angle + dramatic push-ins"
    },
    anime: {
      palette: "Sunset Orange x Electric Blue",
      ambience: "Fast whoosh trails and rising strings",
      lens: "Dynamic cuts + speed lines"
    },
    cartoon: {
      palette: "Candy Gold x Aqua",
      ambience: "Light playful beats with bright stingers",
      lens: "Bounce zoom + squash transitions"
    },
    storyboard: {
      palette: "Ink Violet x Warm Paper",
      ambience: "Soft pencil swipes with calm tone",
      lens: "Panel-to-panel transitions"
    }
  };

  const preset = presetByMode[animationMode.id] ?? presetByMode.cinematic;

  return {
    headline: `${topic} Cinematic Studio`,
    subtitle: `${animationMode.label} mode for ${universe.label}`,
    environment: {
      location: "Hidden Learning Arena",
      backdrop: "Layered mountains, drifting clouds, glowing chakra ring",
      palette: preset.palette,
      ambience: preset.ambience,
      lens: preset.lens
    },
    openingLine: `Tonight's mission: master ${topic} through scene, story, and action.`,
    acts: [
      {
        id: "act-1",
        title: "Act 1: Understand",
        objective: `See ${topic} in one simple story image before any coding or writing.`,
        animationCue: "Skyline dims, concept glyph appears, sensei explains the core in plain words.",
        lead: "Sensei"
      },
      {
        id: "act-2",
        title: "Act 2: Apply",
        objective: `Use ${topic} in a small challenge with a clear input and output.`,
        animationCue: "Hero enters training ground, timer starts, flow arrows animate with each attempt.",
        lead: "Hero"
      },
      {
        id: "act-3",
        title: "Act 3: Prove",
        objective: `Explain your solution like an owner who can ship this in a real team.`,
        animationCue: "Rival tests the edge case, then debrief lights show what improved.",
        lead: "Rival"
      }
    ]
  };
}

export function completeMissionProgress(userRecord, missionId) {
  const trackSeed = getTrack(userRecord.progress?.selectedTrackId);
  const progress = ensureProgressModel(structuredClone(userRecord.progress), userRecord.profile, trackSeed);
  if (!progress.completedMissionIds.includes(missionId)) {
    progress.completedMissionIds.push(missionId);
  }

  const track = getTrack(progress.selectedTrackId);
  const currentIndex = track.missions.findIndex((mission) => mission.id === missionId);
  const nextMission = track.missions[currentIndex + 1] ?? track.missions[currentIndex];
  progress.currentMissionId = nextMission.id;
  progress.sceneProgress[nextMission.id] = progress.sceneProgress[nextMission.id] ?? createSceneProgressState();
  progress.missionHistory.push({ missionId, completedAt: new Date().toISOString() });
  return progress;
}

function buildDashboard(profile, track, mission, progress) {
  const savedLessons = progress.savedLessons ?? [];
  const savedProjects = progress.savedProjects ?? [];
  const videoJobs = progress.videoJobs ?? [];
  const completedMissions = progress.completedMissionIds ?? [];
  const latestLesson = savedLessons[savedLessons.length - 1] ?? null;
  const latestProject = savedProjects[savedProjects.length - 1] ?? null;
  const nextStep = latestLesson
    ? `Practice ${latestLesson.topic} with one easy task and one harder task.`
    : `Start with a lesson on ${profile.courseInterests?.[0] || mission.title}.`;

  return {
    headline: `Welcome back, ${profile.name}`,
    summary: `You are learning through visuals first, then practice, then project building.`,
    metrics: [
      { id: "missions", label: "Completed missions", value: String(completedMissions.length) },
      { id: "lessons", label: "Saved lessons", value: String(savedLessons.length) },
      { id: "projects", label: "Saved projects", value: String(savedProjects.length) },
      { id: "video-jobs", label: "Video renders", value: String(videoJobs.length) },
      { id: "language", label: "Main language", value: profile.primaryLanguage.label }
    ],
    currentFocus: {
      track: track.name,
      mission: mission.title,
      nextStep
    },
    todayPlan: [
      latestLesson
        ? `Rewatch the main idea from ${latestLesson.topic} in simple words.`
        : `Start one clear lesson on ${profile.primaryLanguage.label}.`,
      latestLesson
        ? "Write one tiny explanation and one tiny example from memory."
        : "Generate one guided lesson so the topic feels structured.",
      latestProject
        ? `Connect today's topic back to ${latestProject.title}.`
        : "Turn the topic into a small project idea once it feels clear."
    ],
    encouragement: latestLesson
      ? "You already have momentum. Keep one topic moving before jumping to the next."
      : "Keep the first step small: understand, practice, and save one win.",
    latest: {
      lesson: latestLesson
        ? {
            title: latestLesson.topic,
            summary: latestLesson.summary
          }
        : null,
      project: latestProject
        ? {
            title: latestProject.title,
            summary: latestProject.goal || latestProject.problemStatement || ""
          }
        : null
    }
  };
}

function buildSavedLibrary(progress) {
  return {
    lessons: (progress.savedLessons ?? []).slice(-6).reverse(),
    projects: (progress.savedProjects ?? []).slice(-6).reverse(),
    videos: (progress.videoJobs ?? []).filter((job) => job.status === "completed").slice(-6).reverse()
  };
}

function buildMissionWorkspace(profile, track, mission, progress) {
  const draft = progress.drafts[mission.id] ?? { implementationPlan: "", codeAttempt: "", notes: "" };
  const alternateViews = buildConceptMirrors(track, mission);
  const sceneProgress = progress.sceneProgress?.[mission.id] ?? createSceneProgressState();

  return {
    mission: {
      id: mission.id,
      title: mission.title,
      phase: mission.phase,
      objective: mission.objective,
      companyTicket: mission.companyTicket,
      scene: mission.scene,
      roleArea: mission.roleArea,
      outcomes: mission.outcomes
    },
    missionTicket: {
      objective: mission.objective,
      constraints: [
        "Handle invalid input safely.",
        "Keep the logic explainable in < 90 seconds.",
        "Preserve clear failure and retry behavior."
      ],
      acceptanceChecks: [
        "Input/Output contract is explicit.",
        "Core action separated from validation.",
        "At least one failure path is handled."
      ],
      explainableOutputs: mission.outcomes
    },
    sceneProgress,
    ownershipGoal: buildOwnershipGoal(profile, mission, progress),
    learningLanes: buildLearningLanes(profile, track, mission),
    languageBridge: {
      primary: `${profile.primaryLanguage.label} is the active implementation lane.`,
      later: `${profile.bridgeLanguage.label} remains visible as the next language bridge so the learner can translate the same engineering idea later.`
    },
    starterBlueprint: buildStarterBlueprint(profile, mission),
    draft,
    alternateViews
  };
}

function buildMentorKit(profile, track, mission, progress) {
  return {
    principle: localize(
      profile,
      "Help should increase ownership. Reveal structure, not final dependency on answers.",
      "Help ka purpose ownership badhana hai. Structure dikhao, final dependency mat banao."
    ),
    guardrail: "Mentor can provide strategy, partial structure, and diagnostics, but never complete copy-ready implementation.",
    issueTypes: [
      { id: "stuck", label: "I am stuck implementing it" },
      { id: "confused", label: "I do not understand what the code is doing" },
      { id: "review", label: "I want to explain it like the owner" }
    ],
    recommendedLane: progress.completedMissionIds.length === 0 ? "cinematic" : "builder",
    missionPrompt: `Current mentor mission: ${mission.title}`
  };
}

function buildReviewLab(profile, track, mission, progress) {
  return {
    headline: "Debrief Chamber // Explain like the owner",
    prompts: [
      `What enters ${mission.title} and what leaves it?`,
      `Why does this matter in ${track.name}?`,
      `What failure case would you mention if a reviewer questioned this design?`
    ],
    ownershipScale: [
      "Observer: can repeat what exists",
      "Contributor: can implement guided parts",
      "Owner: can explain design, risks, and tradeoffs"
    ],
    currentPosition: progress.completedMissionIds.includes(mission.id) ? "Contributor to Owner" : "Observer to Contributor"
  };
}

function buildPortfolioSummary(userRecord, track, currentMission) {
  const completedMissions = track.missions.filter((mission) => userRecord.progress.completedMissionIds.includes(mission.id));
  const missionTitles = completedMissions.map((mission) => mission.title);

  return {
    headline: `${userRecord.profile.name}'s portfolio narrative`,
    projectClaim: `${track.name} is shaping into a company-style portfolio build with ${userRecord.profile.roleFocus} ownership.`,
    contributionNarrative: missionTitles.length
      ? `Completed areas: ${missionTitles.join(", ")}. Current focus: ${currentMission.title}.`
      : `The learner is beginning with ${currentMission.title} and building toward an explainable flagship project.`,
    resumeBullets: [
      `Built an adaptive engineering learning workflow around ${track.name}.`,
      `Worked on ${currentMission.roleArea.toLowerCase()} using ${userRecord.profile.primaryLanguage.label} with a ${userRecord.profile.bridgeLanguage.label} bridge plan.`,
      `Practiced architecture explanation, code ownership, and product-facing delivery.`
    ],
    interviewBullets: [
      `I chose ${track.name} because it matched my target role as a ${userRecord.profile.roleFocus}.`,
      `The system taught the same backend ideas through visual scenes, company tickets, and explanation reviews.`,
      `I can explain how the product flows through APIs, persistence, async work, and cloud architecture.`
    ]
  };
}

function buildArchitectureBoard(profile, track, mission) {
  return {
    headline: "Cloud architecture board",
    summary: localize(
      profile,
      "This board turns the project into a cloud-ready mental model with per-user state, load-balanced traffic, async work, and persistent progress.",
      "Yeh board project ko cloud-ready mental model mein turn karta hai jahan per-user state, load-balanced traffic, async work aur persistent progress clearly dikhta hai."
    ),
    nodes: track.architectureNodes.map((node, index) => ({
      label: node,
      emphasis: index === 2 || index === 3 ? "critical" : "normal"
    })),
    notes: [
      `Mission focus: ${mission.title}`,
      "Per-user progress should stay isolated and durable.",
      "Traffic should enter through a stable edge, then move into application services and workers.",
      "Object storage, a progress database, and observability need clear roles in the learner story."
    ]
  };
}

function buildCommandCenter(profile, track, mission, progress) {
  const activeTheme = uiThemePack.find((item) => item.id === profile.uiTheme) ?? uiThemePack[0];
  const activeSceneStyle = sceneStyles.find((item) => item.id === profile.preferredSceneStyle) ?? sceneStyles[0];
  const sceneProgress = progress.sceneProgress?.[mission.id] ?? createSceneProgressState();

  return {
    productName: "NEXUS Robotics OS",
    mode: "AI Operating System",
    activeTheme,
    activeSceneStyle,
    surfaces: ["Dock", "Mission Bridge", "Holo Scene", "Build Forge", "Debrief Chamber", "Career Vault"],
    operationPhase: sceneProgress.phase,
    narration: {
      captionsEnabled: profile.captionsEnabled !== false,
      voiceEnabled: profile.voiceEnabled === true
    }
  };
}

function buildSceneTimeline(profile, track, mission, progress) {
  const sceneProgress = progress.sceneProgress?.[mission.id] ?? createSceneProgressState();
  const operationStep = sceneStateOrder.indexOf(sceneProgress.currentState);
  const phaseByState = {
    trigger: "micro-cinematic",
    route: "micro-cinematic",
    compute: "mini-implementation",
    persist: "mini-implementation",
    async: "mission-application",
    deploy: "mission-application"
  };

  return {
    missionId: mission.id,
    currentState: sceneProgress.currentState,
    sequence: sceneStateOrder.map((stateId, index) => ({
      id: stateId,
      label: titleCase(stateId),
      stage: phaseByState[stateId],
      status: index < operationStep ? "complete" : index === operationStep ? "active" : "queued"
    })),
    cinematicPlan: [
      {
        id: "micro-cinematic",
        label: "Micro cinematic scene",
        status: operationStep <= 1 ? "active" : "complete",
        objective: `Visualize ${mission.title} as a system event before coding decisions.`
      },
      {
        id: "mini-implementation",
        label: "Mini implementation",
        status: operationStep >= 2 && operationStep <= 3 ? "active" : operationStep > 3 ? "complete" : "queued",
        objective: "Author one compact build unit with explicit input and output contracts."
      },
      {
        id: "mission-application",
        label: "Mission application",
        status: operationStep >= 4 ? "active" : "queued",
        objective: "Integrate the code into production-style mission behavior and explain tradeoffs."
      }
    ],
    narration: {
      captions: profile.captionsEnabled !== false,
      voice: profile.voiceEnabled === true
    },
    style: profile.preferredSceneStyle
  };
}

function buildMissionTicket(profile, track, mission, progress) {
  const completed = progress.completedMissionIds.includes(mission.id);
  const sceneProgress = progress.sceneProgress?.[mission.id] ?? createSceneProgressState();
  return {
    id: mission.id,
    title: mission.title,
    objective: mission.objective,
    constraints: [
      "Keep flow traceable from trigger to deploy response.",
      "State one failure and fallback path.",
      "Ensure logic can be explained to a reviewer."
    ],
    acceptanceChecks: [
      "Mission objective is solved by owned code.",
      "System flow is described clearly.",
      "Role-lens reasoning is visible in notes."
    ],
    roleArea: mission.roleArea,
    status: completed ? "deployed" : sceneProgress.currentState === "deploy" ? "ready-for-deploy" : "active"
  };
}

function buildRoleLensOverlay(lens, mission) {
  return [
    `Primary focus: ${lens.focus[0]}`,
    `Secondary focus: ${lens.focus[1]}`,
    `Mission mapping: ${mission.roleArea} -> ${lens.focus.slice(0, 3).join(" / ")}`
  ];
}

function buildDebriefBoard(profile, mission, progress) {
  const history = (progress.debriefHistory ?? progress.reviewHistory ?? []).slice(-5).reverse();
  return {
    chamberName: "Debrief Chamber",
    prompts: [
      `What enters ${mission.title} and what leaves it?`,
      "Which design tradeoff did you choose and why?",
      "What fails first and how does your system recover?"
    ],
    latest: history[0] ?? null,
    trend: history.map((item) => item.score).filter((score) => Number.isFinite(score)),
    objective: "Speak like the engineer who owns this area."
  };
}

function buildCareerVault(userRecord, track, mission) {
  const completed = track.missions.filter((item) => userRecord.progress.completedMissionIds.includes(item.id));
  return {
    title: "Career Vault",
    readiness: completed.length >= Math.ceil(track.missions.length / 2) ? "interview-ready" : "building-evidence",
    evidence: [
      `Track ownership: ${track.name}`,
      `Current role area: ${mission.roleArea}`,
      `Completed operations: ${completed.map((item) => item.title).join(", ") || "none yet"}`
    ],
    explainBackChecklist: [
      "I can narrate trigger -> route -> compute -> persist -> async -> deploy.",
      "I can defend one architecture tradeoff.",
      "I can state what I personally implemented."
    ]
  };
}

function buildLearningStudio(profile, track, mission, progress) {
  const universe = learningUniverses.find((item) => item.id === profile.learningUniverse) ?? learningUniverses[0];
  const animationMode = animationModes.find((item) => item.id === profile.animationPreference) ?? animationModes[0];
  const completedCount = progress.completedMissionIds.length;
  const recommendedTopic = profile.courseInterests?.[0]
    ? profile.courseInterests[0]
    : mission.title;

  return {
    mode: "Universal Story Lab",
    universe,
    animationMode,
    recommendedTopic,
    storyFlow: [
      "Animated story setup",
      "Guided concept simulation",
      "Mini challenge",
      "Applied build/artifact",
      "Portfolio evidence"
    ],
    projectPolicy: "If AI detects a build opportunity, it creates a side project/artifact track automatically."
  };
}

function buildSceneBoard(profile, track, mission) {
  const completed = track.missions.findIndex((item) => item.id === mission.id);
  return {
    theme: profile.primaryDomain.theme,
    accent: profile.primaryDomain.accent,
    headline: `${track.name} // ${mission.title}`,
    description: `${track.animationLanguage} ${mission.scene}`,
    stages: [
      { label: "Client Trigger", state: completed >= 0 ? "active" : "idle" },
      { label: "Edge Control", state: completed >= 0 ? "active" : "idle" },
      { label: "Application Core", state: completed >= 1 ? "active" : "charging" },
      { label: "State Layer", state: completed >= 1 ? "active" : "charging" },
      { label: "Async Reactor", state: completed >= 2 ? "active" : "standby" },
      { label: "Cloud Launch", state: completed >= 3 ? "active" : "standby" }
    ]
  };
}

function buildLearningLanes(profile, track, mission) {
  return [
    {
      id: "cinematic",
      title: "Cinematic Lane",
      description: `Understand ${mission.title} as a visual system event before you code it.`
    },
    {
      id: "builder",
      title: "Builder Lane",
      description: `Break ${mission.companyTicket.toLowerCase()} into three shippable engineering units.`
    },
    {
      id: "company",
      title: "Company Lane",
      description: `Talk about ${mission.roleArea.toLowerCase()} like a teammate shipping a real product area.`
    },
    {
      id: "bridge",
      title: `${profile.bridgeLanguage.label} Bridge`,
      description: `See how the same mission thinking can later transfer into ${profile.bridgeLanguage.label}.`
    }
  ];
}

function buildStarterBlueprint(profile, mission) {
  const language = profile.primaryLanguage.id;
  const blueprint = [
    `1. Define a clear input contract for ${mission.title}.`,
    "2. Split the logic into validation, core action, and result shaping.",
    "3. Name one failure path and decide how the system should react.",
    "4. Keep your structure easy to explain in plain language."
  ];

  const partialSnippet = language === "python"
    ? [
        "def execute_mission(payload):",
        "    validated = validate_payload(payload)",
        "    result = run_core_action(validated)",
        "    return format_response(result)"
      ]
    : [
        "function executeMission(payload) {",
        "  const validated = validatePayload(payload);",
        "  const result = runCoreAction(validated);",
        "  return formatResponse(result);",
        "}"
      ];

  return {
    blueprint,
    partialSnippet,
    warning: "This is only a structural blueprint. The learner still needs to author the real logic and explain it."
  };
}

function buildConceptMirrors(activeTrack, activeMission) {
  return tracks
    .filter((track) => track.id !== activeTrack.id)
    .map((track) => {
      const relatedMission = track.missions.find((mission) => mission.concepts.some((concept) => activeMission.concepts.includes(concept)));
      return relatedMission
        ? {
            trackId: track.id,
            trackName: track.name,
            missionTitle: relatedMission.title,
            angle: `Same concept, different product world: ${relatedMission.objective}`
          }
        : null;
    })
    .filter(Boolean);
}

function buildStructuralBlueprint(profile, mission, analysis) {
  return {
    frame: [
      "Start with a thin controller or handler.",
      "Move the real logic into one named unit with a single responsibility.",
      "Keep validation and result formatting separate from the core action."
    ],
    focus: analysis.gaps.length
      ? `Right now the weak area is ${analysis.gaps[0].toLowerCase()}.`
      : `Your structure can now move toward ${mission.deliverable.toLowerCase()}.`
  };
}

function buildOwnershipSignal(profile, score) {
  if (score >= 80) {
    return `${profile.level.label} signal: you are moving from guided implementation toward explainable ownership.`;
  }

  if (score >= 55) {
    return `${profile.level.label} signal: the foundation is there, but the implementation still needs clearer structure and explanation.`;
  }

  return `${profile.level.label} signal: stay in smaller build loops and ask for hints before pushing full solutions.`;
}

function buildAcceptanceChecks(mission, analysis, score) {
  return [
    {
      label: "Concept coverage",
      pass: analysis.coverageScore >= 60,
      detail: `Matched ${analysis.matchedKeywords.length} concept signals for ${mission.title}.`
    },
    {
      label: "Flow articulation",
      pass: !analysis.gaps.some((gap) => gap.toLowerCase().includes("flow")),
      detail: analysis.gaps.find((gap) => gap.toLowerCase().includes("flow")) || "Request-to-result flow is explicit."
    },
    {
      label: "Deployment readiness",
      pass: score >= 78,
      detail: score >= 78 ? "Ticket is deployment-ready." : "Need one more stabilization pass before deployment."
    }
  ];
}

function buildVisualReplay(mission, analysis, score) {
  const confidence = score >= 80 ? "high" : score >= 60 ? "medium" : "low";
  const activeStates = sceneStateOrder.filter((_, index) => index <= Math.max(1, Math.floor((score / 100) * sceneStateOrder.length)));

  return {
    confidence,
    timeline: activeStates.map((state, index) => ({
      state,
      beat: index + 1,
      caption: `Replay beat ${index + 1}: ${titleCase(state)} state responds to your latest implementation.`
    })),
    headline: `${mission.title} visual replay`,
    summary: `System reached ${activeStates[activeStates.length - 1]} with ${analysis.matchedKeywords.length} matched concept signals.`
  };
}

function analyzeAttempt(codeAttempt, implementationPlan, concepts) {
  const combined = `${implementationPlan || ""} ${codeAttempt || ""}`.toLowerCase();
  const expectedKeywords = concepts.flatMap((concept) => conceptKeywords[concept.toLowerCase()] ?? [concept.toLowerCase()]);
  const matchedKeywords = expectedKeywords.filter((keyword) => combined.includes(keyword));
  const coverageScore = expectedKeywords.length
    ? Math.min(100, Math.round((matchedKeywords.length / expectedKeywords.length) * 100))
    : scoreTextDepth(combined, 30, 120);

  const strengths = [];
  const gaps = [];

  if (codeAttempt && codeAttempt.length > 120) {
    strengths.push("You have enough written material to inspect structure and intent.");
  } else {
    gaps.push("Implementation depth is still light.");
  }

  if (includesAny(combined, ["validate", "guard", "check"])) {
    strengths.push("You are thinking about validation and safety.");
  } else {
    gaps.push("Validation or guardrails are missing from the explanation.");
  }

  if (includesAny(combined, ["request", "response", "queue", "store", "status", "route"])) {
    strengths.push("The system flow is becoming visible in your wording.");
  } else {
    gaps.push("The request-to-result flow still needs to be named more clearly.");
  }

  return {
    coverageScore,
    matchedKeywords,
    strengths,
    gaps,
    signals: [
      `Coverage score: ${coverageScore}`,
      `Matched engineering signals: ${matchedKeywords.slice(0, 6).join(", ") || "none yet"}`,
      `Primary gap: ${gaps[0] || "structure is stabilizing"}`
    ]
  };
}

function rankTracks(profile) {
  return [...tracks]
    .map((track) => ({
      ...track,
      score: computeTrackScore(track, profile)
    }))
    .sort((left, right) => right.score - left.score);
}

function computeTrackScore(track, profile) {
  let score = 0;

  if (track.idealFor.includes(profile.primaryDomain.id)) {
    score += 5;
  }

  if (profile.roleFocus.includes("Backend") || profile.roleFocus.includes("Full-Stack")) {
    score += track.concepts.includes("APIs") ? 2 : 1;
    score += track.concepts.includes("Databases") ? 2 : 1;
  }

  if (profile.goals.some((goal) => goal.includes("job") || goal.includes("placement") || goal.includes("internship"))) {
    score += 2;
  }

  if (profile.existingSkills.some((skill) => ["frontend", "html", "css", "react", "javascript", "typescript"].includes(skill))) {
    score += track.concepts.includes("APIs") ? 2 : 1;
  }

  if (profile.preferredModes.includes("cinematic")) {
    score += 1;
  }

  return score;
}

function computeScore(skills, projects, confidence) {
  const skillScore = skills.reduce((total, skill) => total + (skillWeights[skill] ?? 0), 0);
  const projectScore = Math.min(projects.length, 3) * 2;
  const confidenceScore = confidence === "ready" ? 3 : confidence === "tentative" ? 1 : 0;
  return skillScore + projectScore + confidenceScore;
}

function buildOwnershipGoal(profile, mission, progress) {
  if (progress.completedMissionIds.length === 0 && profile.codeConfidence === "avoid") {
    return "Understand the system flow, write pseudocode, then implement the safest small unit yourself.";
  }

  if (profile.level.id === "ignite" || profile.level.id === "momentum") {
    return `Write the core logic for ${mission.roleArea.toLowerCase()} with guided checkpoints and explain each decision.`;
  }

  return `Own the design choices, risks, and explanation for ${mission.roleArea.toLowerCase()} like a real teammate.`;
}

function resolvePrimaryLanguage(languageId, skills) {
  const recommended = skills.some((skill) => ["frontend", "html", "css", "javascript", "typescript", "react"].includes(skill))
    ? "java"
    : "python";
  return supportLanguages.find((item) => item.id === (languageId || recommended)) ?? supportLanguages[0];
}

function resolveBridgeLanguage(languageId, primaryLanguageId) {
  const fallbackMap = {
    python: "java",
    java: "c",
    c: "python"
  };
  const fallback = fallbackMap[primaryLanguageId] || "python";
  return supportLanguages.find((item) => item.id === (languageId || fallback)) ?? supportLanguages[2];
}

function ensureProgressModel(progress, profile, track) {
  const seedTrack = track ?? tracks[0];
  const base = progress ?? {};
  const currentMissionId = base.currentMissionId || seedTrack.missions[0].id;
  const sceneProgress = { ...(base.sceneProgress ?? {}) };
  sceneProgress[currentMissionId] = sceneProgress[currentMissionId] ?? createSceneProgressState();

  return {
    selectedTrackId: base.selectedTrackId || seedTrack.id,
    currentMissionId,
    completedMissionIds: base.completedMissionIds ?? [],
    drafts: base.drafts ?? {},
    mentorHistory: base.mentorHistory ?? [],
    reviewHistory: base.reviewHistory ?? [],
    debriefHistory: base.debriefHistory ?? [],
    missionHistory: base.missionHistory ?? [],
    architectureNotes: base.architectureNotes ?? [],
    savedLessons: base.savedLessons ?? [],
    savedProjects: base.savedProjects ?? [],
    videoJobs: base.videoJobs ?? [],
    unlockedModes: base.unlockedModes ?? Array.from(new Set(["cinematic", "builder", ...(profile.preferredModes ?? [])])),
    sceneProgress,
    roleLensId: base.roleLensId || profile.selectedRoleLens || "backend"
  };
}

function createSceneProgressState() {
  return {
    currentState: sceneStateOrder[0],
    completedStates: [sceneStateOrder[0]],
    phase: "micro-cinematic",
    updatedAt: new Date().toISOString()
  };
}

function titleCase(value) {
  return String(value)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function buildLibraryId(prefix, value) {
  return `${prefix}-${slugify(value)}-${Date.now()}`;
}

function dedupeLibraryEntries(items) {
  const seen = new Set();
  const ordered = [...items].reverse().filter((item) => {
    const key = `${item.topic || item.title}-${item.goal || item.outcome || item.summary || ""}`.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return ordered.reverse();
}

function getTrack(trackId) {
  return tracks.find((track) => track.id === trackId) ?? tracks[0];
}

function getMission(track, missionId) {
  return track.missions.find((mission) => mission.id === missionId) ?? null;
}

function resolveLectureEmbedUrl(videoUrl, topic) {
  const raw = String(videoUrl || "").trim();

  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      if (id) {
        return `https://www.youtube.com/embed/${id}`;
      }

      const maybeId = url.pathname.split("/").filter(Boolean).pop();
      if (url.pathname.includes("/embed/") && maybeId) {
        return `https://www.youtube.com/embed/${maybeId}`;
      }
    }
  } catch {}

  return "";
}

function buildTopicKeywords(topic) {
  const tokens = String(topic || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);

  const defaultKeywords = ["definition", "example", "steps", "flow", "problem", "solution"];
  return Array.from(new Set([...tokens, ...defaultKeywords]));
}

function normalizeList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map(normalizeItem).filter(Boolean);
  }

  return String(value)
    .split(",")
    .map(normalizeItem)
    .filter(Boolean);
}

function normalizeItem(item) {
  return String(item || "")
    .trim()
    .toLowerCase();
}

function localize(profile, english, hinglish) {
  return profile.communicationStyle === "Hinglish" ? hinglish : english;
}

function scoreTextDepth(text, lowerBound, upperBound) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  if (words <= 0) {
    return 0;
  }
  if (words <= lowerBound) {
    return Math.round((words / lowerBound) * 60);
  }
  if (words >= upperBound) {
    return 100;
  }
  return Math.round(60 + (((words - lowerBound) / (upperBound - lowerBound)) * 40));
}

function includesAny(text, phrases) {
  return phrases.some((phrase) => text.includes(phrase));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
