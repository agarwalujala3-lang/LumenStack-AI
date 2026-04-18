import { animationModes, learningUniverses } from "./catalog.js";

export async function generateSourceLearningExperience(userRecord, input, fetchImpl = fetch) {
  const sourceUrl = String(input.sourceUrl || input.url || "").trim();

  if (!sourceUrl) {
    throw new Error("A source URL is required.");
  }

  let source;
  try {
    source = await fetchSourceDocument(sourceUrl, fetchImpl);
  } catch (error) {
    if (isSourceUrlValidationError(error)) {
      throw error;
    }

    source = buildOfflineSourceDocument(sourceUrl, error);
  }

  return buildSourceLearningExperience(userRecord, source, input);
}

export function buildSourceLearningExperience(userRecord, source, input = {}) {
  const profile = userRecord.profile;
  const animationMode = animationModes.find((item) => item.id === (input.animationMode || profile.animationPreference))
    ?? animationModes[0];
  const universe = learningUniverses.find((item) => item.id === (input.learningUniverse || profile.learningUniverse))
    ?? learningUniverses[0];
  const topic = cleanTopic(source.title || source.description || source.host || "Untitled source");
  const depth = input.depth === "intense" ? "intense" : input.depth === "brief" ? "brief" : "deep";
  const focus = String(input.focus || input.goal || `Explain ${topic} to a Class 1 student with animated storytelling`).trim();
  const conceptChunks = source.paragraphs.length ? source.paragraphs : source.fallbackText;
  const keyIdeas = conceptChunks.slice(0, depth === "intense" ? 6 : depth === "brief" ? 3 : 5);
  const noteSections = buildDeepNoteSections(topic, focus, keyIdeas, source);
  const realWorldExamples = buildRealWorldExamples(topic, source);
  const storyboard = buildStoryboard(topic, source, animationMode, focus, depth);
  const practicePrompts = buildPracticePrompts(topic, source);
  const importantPoints = buildImportantPoints(topic, keyIdeas, focus);
  const cheatSheet = buildCheatSheet(topic, importantPoints, source);
  const flowDiagram = buildFlowDiagram(topic, source, keyIdeas);
  const architectureDiagram = buildArchitectureDiagram(topic, source, keyIdeas);
  const animatedLesson = buildAnimatedLesson(topic, focus, storyboard, realWorldExamples, source, animationMode);
  const kidsMode = buildKidsModeExperience(topic, keyIdeas, storyboard, flowDiagram, source);
  const embedUrl = source.embedUrl || "";
  const heroImage = source.image || source.thumbnail || "";
  const fetchMode = source.fetchMode || "fetched";

  return {
    topic,
    outcome: focus,
    depth,
    source: {
      url: source.url,
      finalUrl: source.finalUrl,
      host: source.host,
      kind: source.kind,
      title: source.title,
      description: source.description,
      image: heroImage,
      embedUrl,
      fetchMode,
      fetchedAt: new Date().toISOString()
    },
    learningUniverse: universe,
    animationMode,
    storyEpisodes: storyboard.map((scene, index) => ({
      id: `${slugify(topic)}-scene-${index + 1}`,
      order: index + 1,
      title: scene.title,
      objective: scene.narration,
      animation: scene.visual
    })),
    cinematicVideoPlan: {
      title: `${topic} cinematic explainer`,
      mode: animationMode.label,
      scenes: storyboard
    },
    animatedLesson,
    kidsMode,
    deepNotes: noteSections,
    importantPoints,
    cheatSheet,
    realWorldExamples,
    flowDiagram,
    architectureDiagram,
    studyMaterial: {
      title: `${topic} source breakdown`,
      simpleSummary: fetchMode === "fetched"
        ? `Fetched from the source and expanded into a ${depth} study path with cinematic scenes and examples.`
        : `The source could not be fetched live, so Lumina generated a ${depth} cinematic study path from URL context and adaptive teaching templates.`,
      lectureVideo: {
        embedUrl,
        searchUrl: source.finalUrl,
        note: embedUrl
          ? "Source video is embedded below."
          : fetchMode === "fetched"
            ? "This source is being used as a reading/video reference."
            : "The source link was unreachable right now, so the lesson uses fallback context."
      },
      visualScenes: storyboard.map((scene) => ({
        title: scene.title,
        caption: scene.visual,
        vibe: scene.vibe,
        lead: scene.lead,
        cameraMove: scene.cameraMove
      })),
      easyConcepts: keyIdeas.slice(0, 4),
      cheatBullets: cheatSheet.mustRemember.slice(0, 4),
      flowHighlights: flowDiagram.steps.map((step) => step.label),
      class1Lines: kidsMode.simpleLines
    },
    practicePrompts,
    sideProject: {
      enabled: true,
      title: `${topic} Applied Build`,
      deliverables: [
        "Detailed source notes",
        "Cinematic storyboard",
        "Real-world example deck",
        "Interview-style explain-back summary"
      ],
      resumeLine: `Converted a live source into a deep AI-guided learning experience with cinematic breakdown and practical examples.`
    },
    generatedAt: new Date().toISOString()
  };
}

export async function fetchSourceDocument(sourceUrl, fetchImpl = fetch) {
  let parsed;

  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error("Please enter a valid HTTP or HTTPS URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }

  const response = await fetchImpl(parsed.toString(), {
    redirect: "follow",
    headers: {
      "User-Agent": "LuminaLearnAI/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Could not fetch the source. Status ${response.status}.`);
  }

  const finalUrl = response.url || parsed.toString();
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const raw = await response.text();
  const kind = detectSourceKind(finalUrl, contentType, raw);
  const title = pickFirst([
    readMeta(raw, "property", "og:title"),
    readMeta(raw, "name", "twitter:title"),
    matchTag(raw, "title")
  ]) || inferTitleFromUrl(finalUrl);
  const description = pickFirst([
    readMeta(raw, "name", "description"),
    readMeta(raw, "property", "og:description"),
    readMeta(raw, "name", "twitter:description")
  ]) || "";
  const image = absolutizeUrl(pickFirst([
    readMeta(raw, "property", "og:image"),
    readMeta(raw, "name", "twitter:image")
  ]), finalUrl);
  const paragraphs = extractParagraphs(raw);
  const videoId = extractYouTubeId(finalUrl);
  const thumbnail = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";
  const embedUrl = buildEmbedUrl(finalUrl);
  const normalizedTitle = normalizeFetchedTitle(cleanText(title), finalUrl, videoId);

  return {
    url: parsed.toString(),
    finalUrl,
    host: new URL(finalUrl).host,
    kind,
    title: normalizedTitle,
    description: cleanText(description),
    image,
    thumbnail,
    embedUrl,
    paragraphs,
    fallbackText: buildFallbackText(raw, cleanText(description), cleanText(title))
  };
}

function buildDeepNoteSections(topic, focus, keyIdeas, source) {
  const sections = [
    {
      title: "Big Picture",
      summary: `This source is mainly about ${topic}. The learning goal is to ${focus.toLowerCase()}.`,
      bullets: [
        keyIdeas[0] || `Start by understanding what ${topic} is and why it matters.`,
        keyIdeas[1] || `Then connect ${topic} to a practical flow or outcome.`,
        source.description || `Use the source language to build context before memorizing details.`
      ]
    },
    {
      title: "How It Works",
      summary: `Break the source into moving parts and cause-effect flow.`,
      bullets: [
        keyIdeas[2] || `Identify the trigger, process, and result around ${topic}.`,
        keyIdeas[3] || `Notice how each step depends on the previous one.`,
        `Translate the source into a simple story you can retell from memory.`
      ]
    },
    {
      title: "Why It Matters",
      summary: `Move from information to relevance.`,
      bullets: [
        `Think about where ${topic} appears in real work, study, or daily life.`,
        `Ask what becomes easier or more powerful once you understand this clearly.`,
        `Notice the risks or mistakes that happen when this idea is misunderstood.`
      ]
    },
    {
      title: "Memory Anchors",
      summary: `Keep the concept easier to remember later.`,
      bullets: [
        `Use one visual metaphor for ${topic}.`,
        `Keep one real-world example and one failure example in memory.`,
        `Explain the idea once in simple words and once in technical words.`
      ]
    }
  ];

  return sections;
}

function buildRealWorldExamples(topic, source) {
  return [
    {
      title: "Everyday example",
      summary: `${topic} can be understood like a step-by-step process you use in daily life, where input, decision, and outcome all matter.`,
      whyItMatters: `This keeps ${topic} from feeling abstract because you can picture it in something familiar.`
    },
    {
      title: "Professional example",
      summary: `In a real team or company, ${topic} helps people make systems, communication, or decisions more reliable and explainable.`,
      whyItMatters: `This is the bridge from study material to what companies actually care about.`
    },
    {
      title: "Failure example",
      summary: `If someone misunderstands ${topic}, the most common problem is that they miss the flow, the edge case, or the reason behind the result.`,
      whyItMatters: `Seeing the failure case helps the learner remember why the concept exists at all.`
    }
  ].map((item) => ({
    ...item,
    sourceTieIn: source.description || source.title
  }));
}

function buildImportantPoints(topic, keyIdeas, focus) {
  const fallback = [
    `Start with the simple meaning of ${topic}.`,
    `Then understand the step-by-step flow behind ${topic}.`,
    `Finally connect ${topic} to a real-world outcome like ${focus.toLowerCase()}.`
  ];

  return keyIdeas.length
    ? keyIdeas.slice(0, 5).map((idea, index) => `Point ${index + 1}: ${truncateSentence(idea, 140)}`)
    : fallback;
}

function buildCheatSheet(topic, importantPoints, source) {
  return {
    headline: `${topic} quick revision`,
    oneLineAnswer: `${topic} becomes easy when you remember its purpose, its flow, and one real-world use.`,
    mustRemember: importantPoints.slice(0, 4),
    commonMistakes: [
      `Memorizing words around ${topic} without understanding the flow.`,
      `Copying examples of ${topic} without knowing why each step exists.`,
      `Forgetting to connect ${topic} to a real-world result or failure case.`
    ],
    interviewStyle: [
      `In simple words, ${topic} is about making the process clear and explainable.`,
      `In real use, ${topic} matters because it makes behavior more reliable and easier to reason about.`,
      `The most common mistake is skipping the flow and only remembering surface definitions.`
    ],
    sourceAnchor: source.description || source.title
  };
}

function buildFlowDiagram(topic, source, keyIdeas) {
  const steps = [
    {
      id: "discover",
      label: "Discover",
      summary: `Meet the core idea of ${topic} in simple words.`
    },
    {
      id: "breakdown",
      label: "Break Down",
      summary: truncateSentence(keyIdeas[0] || `Split ${topic} into clear moving parts.`, 120)
    },
    {
      id: "process",
      label: "Process",
      summary: truncateSentence(keyIdeas[1] || `Follow the cause-and-effect flow behind ${topic}.`, 120)
    },
    {
      id: "real-world",
      label: "Real World",
      summary: `Connect ${topic} to company use, daily life, or practical outcomes.`
    },
    {
      id: "mastery",
      label: "Mastery",
      summary: `Explain ${topic} clearly enough to teach it back.`
    }
  ];

  return {
    title: `${topic} learning flow`,
    subtitle: source.title || source.host,
    steps,
    arrows: steps.slice(0, -1).map((step, index) => ({
      from: step.id,
      to: steps[index + 1].id
    }))
  };
}

function buildArchitectureDiagram(topic, source, keyIdeas) {
  return {
    title: `${topic} architecture view`,
    subtitle: `A simple system view for understanding ${topic}`,
    lanes: [
      {
        id: "input",
        title: "Input",
        items: [
          "source idea",
          "question or trigger",
          truncateSentence(keyIdeas[0] || topic, 70)
        ]
      },
      {
        id: "logic",
        title: "Core Logic",
        items: [
          truncateSentence(keyIdeas[1] || `how ${topic} works step by step`, 70),
          truncateSentence(keyIdeas[2] || `decision points inside ${topic}`, 70),
          `main explanation engine`
        ]
      },
      {
        id: "output",
        title: "Output",
        items: [
          `clear result of ${topic}`,
          "real-world example",
          source.description || "practical takeaway"
        ]
      }
    ],
    connectors: [
      { from: "input", to: "logic", label: "understand" },
      { from: "logic", to: "output", label: "apply" }
    ]
  };
}

function buildAnimatedLesson(topic, focus, storyboard, realWorldExamples, source, animationMode) {
  const chapters = storyboard.map((scene, index) => ({
    id: `${slugify(topic)}-chapter-${index + 1}`,
    index: index + 1,
    title: scene.title,
    summary: scene.narration,
    visual: scene.visual,
    cameraMove: scene.cameraMove,
    lead: scene.lead,
    caption: index === 0
      ? `We begin by making ${topic} feel simple, visual, and easy to care about.`
      : index === storyboard.length - 1
        ? `We finish by connecting ${topic} to ${focus.toLowerCase()} and a real-world use.`
        : `This part turns one difficult layer of ${topic} into a simple scene.`,
    realWorldTieIn: realWorldExamples[index % realWorldExamples.length]?.summary || source.description || ""
  }));

  return {
    status: "storyboard-ready",
    title: `${topic} animated lesson`,
    durationLabel: `${chapters.length + 2}-${chapters.length + 4} min cinematic study cut`,
    heroLine: `An ${animationMode.label.toLowerCase()} learning experience designed to simplify ${topic}.`,
    chapters
  };
}

function buildKidsModeExperience(topic, keyIdeas, storyboard, flowDiagram, source) {
  const simpleLines = [
    `${topic} means we do one small thing at a time.`,
    `First we see what goes in, then we see what happens, then we see the result.`,
    `If something is wrong, we fix it and try again.`,
    `When we understand the steps, the big topic feels easy.`,
    `We can explain ${topic} with a tiny story and a tiny example.`
  ];

  const storyCards = storyboard.slice(0, 4).map((scene, index) => ({
    id: `kid-card-${index + 1}`,
    title: `Story card ${index + 1}`,
    narration: index === 0
      ? `A friend asks, "What is ${topic}?" and we answer using a simple picture story.`
      : scene.narration,
    animationCue: scene.cameraMove,
    imagePrompt: `Colorful classroom illustration showing ${topic} as easy steps with friendly icons and arrows.`
  }));

  const chart = {
    title: `${topic} easy chart`,
    bars: [
      { label: "See it", value: 30, note: "Look at the idea in simple words." },
      { label: "Understand it", value: 45, note: "Follow the steps slowly." },
      { label: "Use it", value: 25, note: "Try one real-life example." }
    ]
  };

  return {
    headline: `Class 1 teacher mode for ${topic}`,
    simpleLines,
    storyCards,
    chart,
    flowForKids: flowDiagram.steps.map((step, index) => ({
      step: index + 1,
      title: step.label,
      kidLine: index === 0
        ? `We start by saying what ${topic} is in one easy sentence.`
        : index === flowDiagram.steps.length - 1
          ? `At the end, we can explain ${topic} to a friend.`
          : `Now we do the next small step and keep it simple.`
    })),
    sourceHint: source.title || source.host
  };
}

function buildStoryboard(topic, source, animationMode, focus, depth) {
  const sceneCount = depth === "intense" ? 6 : depth === "brief" ? 4 : 5;
  const baseShots = [
    { lead: "Guide", vibe: "blue-wave", cameraMove: "Slow cinematic push-in" },
    { lead: "Analyst", vibe: "ember-rise", cameraMove: "Orbit reveal with layered depth" },
    { lead: "Builder", vibe: "teal-pulse", cameraMove: "Tracking sweep across system elements" },
    { lead: "Reviewer", vibe: "gold-drift", cameraMove: "Wide shot into detail focus" },
    { lead: "Guide", vibe: "violet-core", cameraMove: "Impact zoom with floating overlays" },
    { lead: "Builder", vibe: "sunrise-pulse", cameraMove: "Final hero reveal" }
  ];

  return Array.from({ length: sceneCount }, (_, index) => {
    const shot = baseShots[index];
    const chunk = source.paragraphs[index] || source.description || source.title;
    return {
      title: `Scene ${index + 1}: ${sceneTitle(index, topic)}`,
      lead: shot.lead,
      vibe: shot.vibe,
      cameraMove: shot.cameraMove,
      visual: `${animationMode.label} scene showing ${topic} through layered environmental storytelling, cinematic overlays, and clear visual cause-effect.`,
      narration: index === 0
        ? `Open with the source itself, then explain what ${topic} is and why the learner should care.`
        : index === sceneCount - 1
          ? `Close by connecting ${topic} to ${focus.toLowerCase()} and a real-world outcome the learner can explain.`
          : `Use this scene to unpack: ${truncateSentence(chunk, 150)}`
    };
  });
}

function buildPracticePrompts(topic, source) {
  return {
    easy: `Summarize ${topic} in three clear bullet points using one example from the source.`,
    medium: `Explain the flow of ${topic} in your own words and connect it to a real-world case.`,
    advanced: `Teach ${topic} as if you are presenting it to a beginner, including one risk or misconception.`,
    reflection: `What part of ${topic} feels most practical after reading or watching this source?`
  };
}

function extractParagraphs(raw) {
  const noScripts = String(raw || "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gis, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gis, " ");

  const matches = Array.from(noScripts.matchAll(/<p\b[^>]*>(.*?)<\/p>/gis))
    .map((match) => cleanText(stripTags(match[1])))
    .filter((text) => text.length > 80);

  return matches.slice(0, 8);
}

function buildFallbackText(raw, description, title) {
  const text = cleanText(stripTags(raw))
    .split(/(?<=[.!?])\s+/)
    .filter((item) => item.length > 40)
    .slice(0, 6);

  const seed = [description, title, ...text].filter(Boolean);
  return seed.slice(0, 6);
}

function detectSourceKind(url, contentType, raw) {
  const lowerUrl = String(url).toLowerCase();
  if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be") || lowerUrl.includes("vimeo.com")) {
    return "video";
  }
  if (contentType.includes("video")) {
    return "video";
  }
  if (/<video\b/i.test(raw) || /"og:type"\s+content="video/i.test(raw)) {
    return "video";
  }
  return "article";
}

function normalizeFetchedTitle(rawTitle, finalUrl, videoId) {
  const title = cleanText(rawTitle);
  const lowered = title.toLowerCase();

  if (videoId && (!title || lowered === "watch" || lowered === "youtube" || lowered === "youtube - watch")) {
    return `YouTube video ${videoId}`;
  }

  return title || inferTitleFromUrl(finalUrl);
}

function buildOfflineSourceDocument(sourceUrl, error) {
  const parsed = new URL(sourceUrl);
  const finalUrl = parsed.toString();
  const host = parsed.host;
  const inferredTitle = cleanText(inferTitleFromUrl(finalUrl));
  const embedUrl = buildEmbedUrl(finalUrl);
  const videoId = extractYouTubeId(finalUrl);
  const title = videoId ? `YouTube video ${videoId}` : inferredTitle || `Lesson from ${host || "source"}`;
  const reason = cleanText(error?.message || "source fetch unavailable");

  return {
    url: finalUrl,
    finalUrl,
    host,
    kind: videoId ? "video" : "article",
    title,
    description: `Source fetch was unavailable right now (${reason}). Lumina generated a complete learning experience from URL context so study can continue.`,
    image: "",
    thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "",
    embedUrl,
    paragraphs: [],
    fallbackText: [
      `Start with the simple purpose of ${title || "this topic"} and what problem it solves.`,
      `Map the key flow from trigger to output using clear, visual steps.`,
      `Attach one real-world example and one failure case to make retention stronger.`,
      `Host context: ${host}. URL path clue: ${parsed.pathname || "/"}.`,
      `Generate a quick interview-style explanation in plain language and one technical version.`
    ],
    fetchMode: "fallback"
  };
}

function buildEmbedUrl(url) {
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return `https://www.youtube.com/embed/${youtubeId}`;
  }
  return "";
}

function extractYouTubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.split("/").filter(Boolean)[0] || "";
    }
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v") || "";
    }
  } catch {}
  return "";
}

function readMeta(raw, attr, name) {
  const pattern = new RegExp(`<meta[^>]*${attr}=["']${escapeRegex(name)}["'][^>]*content=["']([^"']+)["'][^>]*>`, "i");
  return raw.match(pattern)?.[1] || "";
}

function matchTag(raw, tag) {
  const pattern = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "is");
  return raw.match(pattern)?.[1] || "";
}

function cleanTopic(value) {
  return cleanText(String(value || "").replace(/\s*[-|–].*$/, "")).slice(0, 140) || "Untitled topic";
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .trim();
}

function stripTags(value) {
  return String(value || "").replace(/<[^>]+>/g, " ");
}

function absolutizeUrl(value, base) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value, base).toString();
  } catch {
    return "";
  }
}

function inferTitleFromUrl(url) {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop() || parsed.hostname;
    return last.replace(/[-_]+/g, " ");
  } catch {
    return "Untitled source";
  }
}

function truncateSentence(text, maxLength) {
  const clean = cleanText(text);
  if (clean.length <= maxLength) {
    return clean;
  }
  return `${clean.slice(0, maxLength - 1).trim()}...`;
}

function sceneTitle(index, topic) {
  const titles = [
    `Enter ${topic}`,
    "Core Idea",
    "Step-by-Step Flow",
    "Real-World Meaning",
    "Deep Explanation",
    "Practical Mastery"
  ];
  return titles[index] || topic;
}

function pickFirst(values) {
  return values.find((item) => String(item || "").trim()) || "";
}

function isSourceUrlValidationError(error) {
  const message = String(error?.message || "");
  return message === "Please enter a valid HTTP or HTTPS URL."
    || message === "Only HTTP and HTTPS URLs are supported.";
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}
