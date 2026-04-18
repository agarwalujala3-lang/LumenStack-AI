export const learningModes = [
  {
    id: "cinematic",
    label: "Cinematic Flow",
    description: "Explain the system like a living scene with motion, signal paths, and visible reactions."
  },
  {
    id: "builder",
    label: "Build Sprint",
    description: "Turn each concept into a ticket and ship working pieces in focused engineering bursts."
  },
  {
    id: "mentor",
    label: "AI Mentor",
    description: "Use progressive hints, restarts, and confidence-aware coaching when the learner gets stuck."
  },
  {
    id: "review",
    label: "Company Review",
    description: "Practice defending architecture, reviewing code, and talking like an owner."
  },
  {
    id: "debug",
    label: "Debug Lab",
    description: "Learn through failures, retries, and production-style incident reasoning."
  }
];

export const communicationStyles = ["English", "Hinglish"];

export const uiThemePack = [
  {
    id: "nexus-command",
    label: "NEXUS Command",
    description: "High-contrast command deck with neon telemetry trails."
  },
  {
    id: "orbital-ops",
    label: "Orbital Ops",
    description: "Cool-toned orbital grid with scan-line overlays."
  },
  {
    id: "forge-redline",
    label: "Forge Redline",
    description: "Aggressive ops palette for incident-heavy simulations."
  }
];

export const sceneStyles = [
  {
    id: "holo-grid",
    label: "Holo Grid",
    description: "Clean holographic overlays with strong route emphasis."
  },
  {
    id: "reactor-surge",
    label: "Reactor Surge",
    description: "Energetic pulses and large state transitions for each concept."
  },
  {
    id: "orbit-calm",
    label: "Orbit Calm",
    description: "Low-noise cinematic progression with high readability."
  }
];

export const roleLenses = [
  {
    id: "backend",
    label: "Backend Lens",
    focus: ["API contracts", "Validation", "Persistence", "Error handling"]
  },
  {
    id: "dsa",
    label: "DSA Lens",
    focus: ["Data structures", "Complexity", "Tradeoffs", "Scaling pressure"]
  },
  {
    id: "aws",
    label: "AWS Lens",
    focus: ["Service mapping", "Load balancing", "Storage durability", "Monitoring"]
  },
  {
    id: "deployment",
    label: "Deployment Lens",
    focus: ["Release strategy", "Rollback readiness", "Health checks", "Observability"]
  }
];

export const operationVocabulary = {
  module: "surface",
  lesson: "briefing",
  chapter: "operation",
  task: "ticket",
  review: "debrief",
  course: "mission arc",
  complete: "deploy ready",
  progress: "system telemetry"
};

export const learningUniverses = [
  {
    id: "programming-systems",
    label: "Programming & Systems",
    examples: ["Backend", "DSA", "AWS", "Deployment", "Frontend"]
  },
  {
    id: "language-mastery",
    label: "Languages & Communication",
    examples: ["English fluency", "Public speaking", "Vocabulary", "Storytelling"]
  },
  {
    id: "science-math",
    label: "Science & Math",
    examples: ["Physics", "Chemistry", "Biology", "Math reasoning"]
  },
  {
    id: "business-creator",
    label: "Business & Creator Skills",
    examples: ["Marketing", "Sales", "Branding", "Content systems"]
  },
  {
    id: "exam-career",
    label: "Exam & Career Mastery",
    examples: ["Interview prep", "Aptitude", "Case solving", "Portfolio strategy"]
  }
];

export const animationModes = [
  {
    id: "cinematic",
    label: "Cinematic",
    tone: "Movie-like dramatic motion and scene transitions."
  },
  {
    id: "anime",
    label: "Anime",
    tone: "High-energy stylized shots and character-driven storytelling."
  },
  {
    id: "cartoon",
    label: "Cartoon",
    tone: "Fun visual metaphors and playful memory anchors."
  },
  {
    id: "storyboard",
    label: "Storyboard",
    tone: "Illustrated sequences with clear visual logic."
  }
];

export const supportLanguages = [
  {
    id: "python",
    label: "Python",
    category: "academy",
    promise: "Friendly first language for logic, automation, AI foundations, and fast confidence-building."
  },
  {
    id: "c",
    label: "C",
    category: "academy",
    promise: "Best for learning memory, control flow, and how programming works close to the machine."
  },
  {
    id: "java",
    label: "Java",
    category: "academy",
    promise: "Strong path for OOP, backend foundations, and professional project structure."
  },
  {
    id: "typescript",
    label: "TypeScript",
    category: "primary",
    promise: "Best first choice for frontend-minded learners because the same language carries into backend work."
  },
  {
    id: "javascript",
    label: "JavaScript",
    category: "primary",
    promise: "Fastest path into full-stack flows with the least friction."
  }
];

export const domains = [
  { id: "ai-automation", label: "AI Automation", vibe: "Neural command center", theme: "aurora-grid", accent: "#5cffb2" },
  { id: "cloud-ops", label: "Cloud Operations", vibe: "Mission control for live systems", theme: "ion-storm", accent: "#70e1ff" },
  { id: "fintech", label: "FinTech", vibe: "High-trust transaction engine", theme: "gold-circuit", accent: "#f4c66b" },
  { id: "cyber", label: "Cyber Response", vibe: "Threat map and response matrix", theme: "crimson-scan", accent: "#ff7f89" },
  { id: "creator", label: "Creator Tools", vibe: "High-volume asset pipeline", theme: "sunset-signal", accent: "#ffb46a" },
  { id: "ecommerce", label: "Commerce Systems", vibe: "Order, fulfillment, and growth engine", theme: "teal-fusion", accent: "#60ffd8" }
];

export const roles = [
  "Backend Engineer",
  "Full-Stack Engineer",
  "Cloud Engineer",
  "AI Engineer",
  "Founding Engineer",
  "Technical Product Builder"
];

export const tracks = [
  {
    id: "aether-ops",
    name: "AetherOps Command Grid",
    summary: "An AI workflow platform where requests move through APIs, storage, queues, workers, and deployment channels.",
    companyAngle: "Feels like building the product core of an AI automation startup.",
    idealFor: ["ai-automation", "cloud-ops", "creator"],
    concepts: ["Functions", "APIs", "Classes", "Databases", "Queues", "Background Jobs", "AWS"],
    animationLanguage: "Pulse lanes, core reactors, and skyline-scale rollout events.",
    architectureNodes: ["Client", "CDN", "Load Balancer", "API Gate", "Core Service", "Queue", "Worker Cluster", "Object Storage", "Progress DB"],
    missions: [
      {
        id: "mission-auth-gate",
        title: "Identity Gate",
        phase: "System Entry",
        objective: "Create sign-up, session, and role-aware access flow for the command grid.",
        companyTicket: "Ship secure learner onboarding and protect per-user mission state.",
        concepts: ["Functions", "Validation", "Authentication"],
        scene: "A biometric gate unlocks as trusted packets pass through an intake chamber.",
        deliverable: "Session-safe onboarding pipeline and profile persistence.",
        roleArea: "Platform Access",
        outcomes: ["Input validation", "Session modeling", "User identity flow"]
      },
      {
        id: "mission-request-router",
        title: "Signal Router",
        phase: "Engine Room",
        objective: "Route incoming jobs to the correct service lane and keep state readable.",
        companyTicket: "Own the request orchestration layer for all workflow events.",
        concepts: ["Functions", "Conditionals", "API Design"],
        scene: "Signals split across glowing transit rails toward specialized service cells.",
        deliverable: "API routing and clean request-response behavior.",
        roleArea: "Core API Layer",
        outcomes: ["Routing", "API contracts", "Error mapping"]
      },
      {
        id: "mission-job-engine",
        title: "Queue Reactor",
        phase: "Engine Room",
        objective: "Model a job queue with retries, priority, and execution status.",
        companyTicket: "Make background execution reliable enough for real user workloads.",
        concepts: ["Classes", "Queues", "Error Handling", "DSA"],
        scene: "Pods move through a reactor ring while retry chambers flash when failures occur.",
        deliverable: "Worker-ready job objects with durable lifecycle tracking.",
        roleArea: "Background Execution",
        outcomes: ["Queue modeling", "Retry logic", "Lifecycle state"]
      },
      {
        id: "mission-cloud-launch",
        title: "Skyline Deploy",
        phase: "Cloud Launch",
        objective: "Map the system to AWS-style infrastructure with load balancing, storage, and monitoring.",
        companyTicket: "Prepare the platform for production-style deployment and explanation.",
        concepts: ["AWS", "Deployment", "Observability"],
        scene: "A city-scale skyline powers on as service zones roll live in synchronized waves.",
        deliverable: "Production-ready cloud blueprint and deployment narrative.",
        roleArea: "Cloud Readiness",
        outcomes: ["Architecture explanation", "Environment thinking", "Load balancing mental model"]
      }
    ]
  },
  {
    id: "vault-stream",
    name: "VaultStream Processing Fabric",
    summary: "A cloud file pipeline for intake, scanning, transformation, storage, and live status delivery.",
    companyAngle: "Feels like building the ingestion and asset core of a serious SaaS platform.",
    idealFor: ["creator", "ecommerce", "cloud-ops"],
    concepts: ["Functions", "File Handling", "Storage", "Metadata", "Databases", "Queues", "AWS S3"],
    animationLanguage: "Cargo lanes, loader arms, scanner tunnels, and memory vault chambers.",
    architectureNodes: ["Client", "Upload Edge", "Validation Gate", "Metadata Service", "Object Storage", "Transform Queue", "Worker Pods", "Notifications", "Audit DB"],
    missions: [
      {
        id: "mission-upload-intake",
        title: "Intake Bay",
        phase: "System Entry",
        objective: "Accept uploads and validate format, size, and ownership before entry.",
        companyTicket: "Protect the ingestion edge from bad files and bad requests.",
        concepts: ["Functions", "Validation", "File APIs"],
        scene: "Assets descend into a scanner tunnel where invalid files are rerouted out of the system.",
        deliverable: "Reliable upload guardrail logic.",
        roleArea: "Upload Gateway",
        outcomes: ["Validation", "Request parsing", "Safe file intake"]
      },
      {
        id: "mission-metadata-vault",
        title: "Vault Ledger",
        phase: "Engine Room",
        objective: "Persist metadata, ownership, and processing state cleanly.",
        companyTicket: "Own the persistence layer that keeps every asset traceable.",
        concepts: ["Databases", "Schemas", "CRUD"],
        scene: "Steel vault chambers seal each record into a glowing archive spine.",
        deliverable: "Clear persistence layer and domain models.",
        roleArea: "Data Modeling",
        outcomes: ["Schema thinking", "CRUD ownership", "State modeling"]
      },
      {
        id: "mission-transform-loop",
        title: "Transform Loop",
        phase: "Engine Room",
        objective: "Trigger processing jobs, update statuses, and surface progress live.",
        companyTicket: "Build the asynchronous core that makes the pipeline feel alive.",
        concepts: ["Queues", "Workers", "Status Systems", "Polling"],
        scene: "Robotic arms pull jobs from a spinning ring and return transformed outputs.",
        deliverable: "Event-driven processing behavior.",
        roleArea: "Async Pipeline",
        outcomes: ["Queue reasoning", "State updates", "Background work"]
      },
      {
        id: "mission-storage-launch",
        title: "Storage Orbit",
        phase: "Cloud Launch",
        objective: "Map object storage, CDN delivery, and cloud scaling decisions.",
        companyTicket: "Explain how this product would run in a real cloud stack.",
        concepts: ["AWS S3", "CloudFront", "Deployment"],
        scene: "Orbital storage rings light up as distribution lanes extend to the client edge.",
        deliverable: "Cloud storage and delivery architecture plan.",
        roleArea: "Delivery Architecture",
        outcomes: ["Storage mental model", "Delivery pipeline", "Scalability story"]
      }
    ]
  },
  {
    id: "pulse-board",
    name: "PulseBoard Systems Console",
    summary: "A live operations dashboard for alerts, incidents, service topology, and release control.",
    companyAngle: "Feels like building an internal platform used by engineering, support, and ops teams.",
    idealFor: ["cloud-ops", "cyber", "fintech"],
    concepts: ["Classes", "Dashboards", "Realtime Data", "Graphs", "Deployment", "AWS", "DSA"],
    animationLanguage: "Threat maps, alert storms, service rings, and release-wave telemetry.",
    architectureNodes: ["Clients", "Realtime API", "Incident Store", "Priority Queue", "Topology Graph", "Release Controller", "Metrics Stream", "Cloud Regions"],
    missions: [
      {
        id: "mission-alert-stream",
        title: "Alert Stream",
        phase: "System Entry",
        objective: "Model incident events and prioritize them by severity and urgency.",
        companyTicket: "Make noisy operational data usable by the team in real time.",
        concepts: ["Classes", "Priority Queues", "Sorting"],
        scene: "Alert shards rain into a triage field and reorganize by threat level.",
        deliverable: "Clear incident intake and prioritization logic.",
        roleArea: "Incident Intake",
        outcomes: ["Objects", "Priority logic", "Operational signal handling"]
      },
      {
        id: "mission-service-map",
        title: "Service Topology",
        phase: "Engine Room",
        objective: "Represent services, dependencies, and health states on a live map.",
        companyTicket: "Own the system model that helps engineers reason about failures.",
        concepts: ["Graphs", "Objects", "Visualization"],
        scene: "Nodes light up across a network lattice as dependencies pulse between systems.",
        deliverable: "System-map mental model and graph-oriented thinking.",
        roleArea: "Topology Modeling",
        outcomes: ["Graph thinking", "Dependencies", "System reasoning"]
      },
      {
        id: "mission-release-control",
        title: "Release Control",
        phase: "Engine Room",
        objective: "Track rollout state, rollback readiness, and environment confidence.",
        companyTicket: "Build confidence around shipping changes safely.",
        concepts: ["Deployment", "State Management", "AWS"],
        scene: "Deployment waves sweep across environment sectors with rollback shields on standby.",
        deliverable: "Production-facing release operations understanding.",
        roleArea: "Release Safety",
        outcomes: ["State transitions", "Deployment logic", "Rollback thinking"]
      },
      {
        id: "mission-war-room",
        title: "War Room",
        phase: "Cloud Launch",
        objective: "Explain the end-to-end architecture and your ownership in a real company-style review.",
        companyTicket: "Present the platform like the engineer responsible for the system area.",
        concepts: ["Architecture Review", "Ownership", "Communication"],
        scene: "The command wall zooms out to show regions, traffic, dependencies, and failure boundaries.",
        deliverable: "Interview-ready platform explanation and ownership narrative.",
        roleArea: "Architecture Communication",
        outcomes: ["Explain-back confidence", "Architecture articulation", "Role ownership"]
      }
    ]
  }
];
