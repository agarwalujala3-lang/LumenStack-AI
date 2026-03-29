const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");
const AdmZip = require("adm-zip");

const execFileAsync = promisify(execFile);
const runtimeRoot = path.join(process.cwd(), ".runtime");
const SUPPORTED_SOURCE_PLATFORMS = [
  {
    id: "github",
    name: "GitHub",
    exampleUrl: "https://github.com/owner/repo",
    supportsWebhook: true,
    hostPatterns: ["github.com"]
  },
  {
    id: "gitlab",
    name: "GitLab",
    exampleUrl: "https://gitlab.com/group/project",
    supportsWebhook: false,
    hostPatterns: ["gitlab.com"]
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    exampleUrl: "https://bitbucket.org/workspace/repo",
    supportsWebhook: false,
    hostPatterns: ["bitbucket.org"]
  },
  {
    id: "azure-devops",
    name: "Azure DevOps",
    exampleUrl: "https://dev.azure.com/org/project/_git/repo",
    supportsWebhook: false,
    hostPatterns: ["dev.azure.com", "visualstudio.com"]
  },
  {
    id: "gitea",
    name: "Gitea or Forgejo",
    exampleUrl: "https://git.example.com/team/repo.git",
    supportsWebhook: false,
    hostPatterns: ["gitea", "forgejo"]
  },
  {
    id: "generic-git",
    name: "Generic Git",
    exampleUrl: "https://git.example.com/team/repo.git",
    supportsWebhook: false,
    hostPatterns: ["custom https git host"]
  },
  {
    id: "upload",
    name: "ZIP Upload",
    exampleUrl: "Drop a ZIP archive instead of cloning a remote repository",
    supportsWebhook: false,
    hostPatterns: ["local archive"]
  }
];

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function detectProjectRoot(extractedPath) {
  const entries = await fs.readdir(extractedPath, { withFileTypes: true });
  const visibleEntries = entries.filter((entry) => !entry.name.startsWith("__MACOSX"));

  if (visibleEntries.length === 1 && visibleEntries[0].isDirectory()) {
    return path.join(extractedPath, visibleEntries[0].name);
  }

  return extractedPath;
}

function isMissingRefError(message) {
  return /remote branch .* not found|couldn't find remote ref|did not match any file\(s\) known to git|pathspec .* did not match|not our ref/i.test(
    String(message || "")
  );
}

function toFriendlyCloneError(error, ref = "") {
  const stderr = String(error?.stderr || error?.message || "").trim();

  if (/not recognized|ENOENT/i.test(stderr) || error?.code === "ENOENT") {
    return "Git is not available locally. Upload a ZIP file instead.";
  }

  if (ref && isMissingRefError(stderr)) {
    return `Repository ref "${ref}" was not found. Check that the branch, tag, or commit exists and is public.`;
  }

  return stderr || "Unable to clone the repository.";
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function detectProvider(parsedUrl) {
  const hostname = parsedUrl.hostname.toLowerCase();

  if (hostname === "github.com" || hostname.endsWith(".github.com")) {
    return {
      id: "github",
      name: "GitHub"
    };
  }

  if (hostname === "gitlab.com" || hostname.includes("gitlab")) {
    return {
      id: "gitlab",
      name: "GitLab"
    };
  }

  if (hostname === "bitbucket.org" || hostname.includes("bitbucket")) {
    return {
      id: "bitbucket",
      name: "Bitbucket"
    };
  }

  if (hostname === "dev.azure.com" || hostname.endsWith(".visualstudio.com")) {
    return {
      id: "azure-devops",
      name: "Azure DevOps"
    };
  }

  if (hostname.includes("gitea") || hostname.includes("forgejo")) {
    return {
      id: "gitea",
      name: "Gitea or Forgejo"
    };
  }

  return {
    id: "generic-git",
    name: "Generic Git"
  };
}

function extractRepositorySegments(parsedUrl, providerId) {
  const segments = parsedUrl.pathname.split("/").filter(Boolean).map((segment) => safeDecode(segment));

  if (providerId === "azure-devops") {
    const gitIndex = segments.findIndex((segment) => segment.toLowerCase() === "_git");

    if (gitIndex !== -1 && gitIndex + 1 < segments.length) {
      const repoSegments = segments.slice(0, gitIndex).concat(segments[gitIndex + 1]);
      return repoSegments.filter(Boolean);
    }
  }

  return segments;
}

function buildRepositoryMetadata(parsedUrl) {
  const provider = detectProvider(parsedUrl);
  const repositorySegments = extractRepositorySegments(parsedUrl, provider.id);
  const repositoryName = repositorySegments[repositorySegments.length - 1] || "repository";
  const ownerOrWorkspace = repositorySegments.slice(0, -1).join("/");
  const repositoryPath = repositorySegments.join("/").replace(/\.git$/i, "");
  const workspaceKey = repositoryPath
    ? `${provider.id}:${repositoryPath.toLowerCase()}`
    : `${provider.id}:${slugify(repositoryName)}`;

  return {
    providerId: provider.id,
    providerName: provider.name,
    repositoryName: repositoryName.replace(/\.git$/i, ""),
    repositoryPath,
    workspaceLabel: ownerOrWorkspace
      ? `${provider.name} / ${ownerOrWorkspace}`
      : provider.name,
    workspaceKey
  };
}

async function runGit(args, options = {}) {
  return execFileAsync("git", args, {
    cwd: process.cwd(),
    windowsHide: true,
    ...options
  });
}

async function cloneDefaultBranch(repoUrl, workingDir) {
  await runGit(["clone", "--depth", "1", repoUrl, workingDir]);
}

async function cloneSpecificRef(repoUrl, workingDir, ref) {
  await runGit(["clone", "--depth", "1", "--branch", ref, "--single-branch", repoUrl, workingDir]);
}

async function fetchAndCheckoutRef(repoUrl, workingDir, ref) {
  await cloneDefaultBranch(repoUrl, workingDir);
  await runGit(["fetch", "--depth", "1", "origin", ref], { cwd: workingDir });
  await runGit(["checkout", "FETCH_HEAD"], { cwd: workingDir });
}

async function cloneRepository(repoUrl, ref = "") {
  let parsedUrl;

  try {
    parsedUrl = new URL(repoUrl);
  } catch {
    throw new Error("Repository URL is invalid.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only HTTP(S) repository URLs are supported.");
  }

  const metadata = buildRepositoryMetadata(parsedUrl);
  const repoName = slugify(metadata.repositoryName || "repository");
  const workingDir = path.join(runtimeRoot, "repos", `${repoName}-${randomUUID()}`);

  await ensureDir(path.dirname(workingDir));

  try {
    if (ref) {
      try {
        await cloneSpecificRef(repoUrl, workingDir, ref);
      } catch (error) {
        if (!isMissingRefError(error?.stderr || error?.message || "")) {
          throw error;
        }

        await fs.rm(workingDir, { recursive: true, force: true });
        await fetchAndCheckoutRef(repoUrl, workingDir, ref);
      }
    } else {
      await cloneDefaultBranch(repoUrl, workingDir);
    }
  } catch (error) {
    throw new Error(toFriendlyCloneError(error, ref));
  }

  return {
    sourceType: "git",
    sourceName: metadata.repositoryName,
    sourcePlatform: metadata.providerName,
    sourcePlatformId: metadata.providerId,
    sourceWorkspaceLabel: metadata.workspaceLabel,
    sourceWorkspaceKey: metadata.workspaceKey,
    sourceRepoUrl: repoUrl,
    rootPath: workingDir,
    cleanup: async () => {
      await fs.rm(workingDir, { recursive: true, force: true });
    }
  };
}

async function extractZip(uploadedFile) {
  const originalName = uploadedFile.originalname || "upload.zip";
  const sourceName = slugify(originalName.replace(/\.zip$/i, "")) || "uploaded-codebase";
  const extractDir = path.join(runtimeRoot, "uploads", `${sourceName}-${randomUUID()}`);

  await ensureDir(path.dirname(extractDir));
  await ensureDir(extractDir);

  try {
    const zip = new AdmZip(uploadedFile.path);
    zip.extractAllTo(extractDir, true);
  } catch {
    throw new Error("Uploaded file is not a readable ZIP archive.");
  }

  const projectRoot = await detectProjectRoot(extractDir);

  return {
    sourceType: "upload",
    sourceName,
    sourcePlatform: "ZIP Upload",
    sourcePlatformId: "upload",
    sourceWorkspaceLabel: "Local archive workspace",
    sourceWorkspaceKey: `upload:${sourceName}`,
    sourceRepoUrl: "",
    rootPath: projectRoot,
    cleanup: async () => {
      await fs.rm(extractDir, { recursive: true, force: true });
      await fs.rm(uploadedFile.path, { force: true });
    }
  };
}

async function prepareSource({ repoUrl, uploadedFile, ref = "" }) {
  await ensureDir(runtimeRoot);

  if (repoUrl) {
    if (uploadedFile?.path) {
      await fs.rm(uploadedFile.path, { force: true });
    }

    return cloneRepository(repoUrl, ref);
  }

  if (uploadedFile) {
    return extractZip(uploadedFile);
  }

  throw new Error("No source was provided.");
}

module.exports = {
  prepareSource,
  getSupportedSourcePlatforms: () => SUPPORTED_SOURCE_PLATFORMS.map((platform) => ({ ...platform }))
};
