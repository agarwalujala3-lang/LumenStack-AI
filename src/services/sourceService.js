const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");
const AdmZip = require("adm-zip");

const execFileAsync = promisify(execFile);
const runtimeRoot = path.join(process.cwd(), ".runtime");

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

  const repoName = slugify(
    parsedUrl.pathname.split("/").filter(Boolean).pop()?.replace(/\.git$/i, "") ||
      "repository"
  );
  const workingDir = path.join(runtimeRoot, "repos", `${repoName}-${randomUUID()}`);

  await ensureDir(path.dirname(workingDir));

  try {
    await execFileAsync("git", ["clone", "--depth", "1", repoUrl, workingDir], {
      cwd: process.cwd(),
      windowsHide: true
    });

    if (ref) {
      await execFileAsync("git", ["checkout", ref], {
        cwd: workingDir,
        windowsHide: true
      });
    }
  } catch (error) {
    const stderr = error.stderr || "";

    if (/not recognized|ENOENT/i.test(stderr) || error.code === "ENOENT") {
      throw new Error("Git is not available locally. Upload a ZIP file instead.");
    }

    throw new Error(stderr.trim() || "Unable to clone the repository.");
  }

  return {
    sourceType: "github",
    sourceName: repoName,
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
  prepareSource
};
