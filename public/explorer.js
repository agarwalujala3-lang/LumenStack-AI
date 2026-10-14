(function () {
  const state = document.getElementById("explorer-state");
  const workspace = document.getElementById("editor-workspace");
  const filesPane = document.getElementById("file-tree");
  const searchInput = document.getElementById("file-search");
  const codeLines = document.getElementById("code-lines");
  const fileNotice = document.getElementById("file-notice");
  const copyStatus = document.getElementById("copy-status");
  let analysisId = "";
  let fileIndex = [];
  let repository = null;
  let activePath = "";
  let previewSequence = 0;

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function showState(title, copy, isError = false) {
    state.replaceChildren();
    state.classList.toggle("is-error", isError);
    const mark = makeElement("div", "state-mark", isError ? "!" : "LS");
    mark.setAttribute("aria-hidden", "true");
    const body = makeElement("div", "");
    body.append(makeElement("h2", "", title), makeElement("p", "", copy));
    const link = makeElement("a", "primary-button compact-button", "Analyze a repository");
    link.href = "/#analyze-panel";
    body.append(link);
    state.append(mark, body);
    state.hidden = false;
    workspace.hidden = true;
  }

  function buildTree() {
    filesPane.replaceChildren();
    const filter = searchInput.value.trim().toLowerCase();
    if (filter) {
      const matches = fileIndex.filter((file) =>
        `${file.path} ${file.module} ${file.language} ${file.role}`.toLowerCase().includes(filter)
      );
      if (!matches.length) {
        filesPane.append(makeElement("p", "tree-empty", "No matching source files."));
        return;
      }
      for (const file of matches.slice(0, 250)) filesPane.append(createFileButton(file, true));
      if (matches.length > 250) filesPane.append(makeElement("p", "pane-footnote", "Refine your search to narrow these results."));
      return;
    }

    const tree = { directories: new Map(), files: [] };
    for (const file of fileIndex) {
      const segments = file.path.split("/");
      let branch = tree;
      for (const segment of segments.slice(0, -1)) {
        if (!branch.directories.has(segment)) {
          branch.directories.set(segment, { directories: new Map(), files: [] });
        }
        branch = branch.directories.get(segment);
      }
      branch.files.push(file);
    }

    renderTreeBranch(filesPane, tree, 0);
    if (!fileIndex.length) filesPane.append(makeElement("p", "tree-empty", "No source files were indexed."));
  }

  function createFileButton(file, showPath = false) {
    const button = makeElement("button", "tree-file");
    button.type = "button";
    button.dataset.filePath = file.path;
    button.disabled = !file.previewable;
    button.title = file.previewable ? `${file.path} · ${file.role}` : `${file.path} · Preview unavailable`;
    const mark = makeElement("span", `file-type-mark ${languageClass(file.language)}`, fileExtension(file.path));
    mark.setAttribute("aria-hidden", "true");
    button.append(mark, makeElement("span", "tree-file-name", showPath ? file.path : file.path.split("/").pop()));
    button.setAttribute("aria-current", file.path === activePath ? "true" : "false");
    return button;
  }

  function renderTreeBranch(container, branch, depth) {
    const directories = [...branch.directories.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [name, child] of directories) {
      const details = document.createElement("details");
      details.className = "tree-folder";
      details.open = depth < 1;
      const summary = document.createElement("summary");
      summary.append(makeElement("span", "folder-mark", "▸"), makeElement("span", "tree-folder-name", name));
      const count = countTreeFiles(child);
      summary.append(makeElement("span", "tree-folder-count", String(count)));
      const group = makeElement("div", "tree-group");
      renderTreeBranch(group, child, depth + 1);
      details.append(summary, group);
      container.append(details);
    }
    branch.files.sort((a, b) => a.path.localeCompare(b.path));
    for (const file of branch.files) container.append(createFileButton(file));
  }

  function countTreeFiles(branch) {
    let count = branch.files.length;
    for (const child of branch.directories.values()) count += countTreeFiles(child);
    return count;
  }

  function fileExtension(path) {
    const parts = path.split(".");
    return (parts.length > 1 ? parts.pop() : "src").slice(0, 4).toUpperCase();
  }

  function languageClass(language) {
    return `language-${String(language || "text").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  }

  async function requestJson(url) {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "The repository session is unavailable.");
    return payload;
  }

  function renderOverview(data) {
    const summary = data.summary || {};
    const source = data.source || {};
    document.getElementById("repository-name").textContent = source.name || "Analyzed repository";
    document.title = `${source.name || "Repository"} Explorer | LumenStack AI`;
    document.getElementById("repository-meta").textContent = [source.platform, source.ref ? `ref ${source.ref}` : "", source.type === "upload" ? "ZIP snapshot" : ""].filter(Boolean).join(" · ");
    document.getElementById("workspace-stats").hidden = false;
    document.getElementById("stat-files").textContent = Number(summary.codeFiles || data.totalFiles || fileIndex.length).toLocaleString();
    document.getElementById("stat-modules").textContent = String((data.modules || []).length);
    document.getElementById("stat-language").textContent = summary.primaryLanguage || "Unknown";
    document.getElementById("tree-count").textContent = fileIndex.length.toLocaleString();
    document.getElementById("file-limit-note").hidden = !data.filesLimited;
    document.getElementById("repository-summary").textContent = data.explanation || `${source.name || "This repository"} contains ${summary.codeFiles || fileIndex.length} indexed code files across ${(data.modules || []).length} detected modules.`;

    const tags = document.getElementById("repository-tags");
    tags.replaceChildren();
    const languages = (summary.languages || []).slice(0, 4).map((item) => typeof item === "string" ? item : item.name);
    const frameworks = (summary.frameworks || []).slice(0, 4);
    for (const label of [...new Set([summary.primaryLanguage, ...frameworks, ...languages].filter(Boolean))].slice(0, 7)) {
      tags.append(makeElement("span", "repo-tag", label));
    }

    const entrypoints = document.getElementById("entrypoint-list");
    const paths = new Set(fileIndex.map((file) => file.path));
    const visibleEntrypoints = (summary.entrypoints || []).filter((path) => paths.has(path)).slice(0, 8);
    document.getElementById("entrypoint-count").textContent = String(visibleEntrypoints.length);
    entrypoints.replaceChildren();
    if (!visibleEntrypoints.length) entrypoints.append(makeElement("p", "context-empty", "No obvious entrypoint detected."));
    for (const path of visibleEntrypoints) {
      const button = makeElement("button", "context-file", path);
      button.type = "button";
      button.addEventListener("click", () => openFile(path));
      entrypoints.append(button);
    }

    const modules = document.getElementById("module-list");
    modules.replaceChildren();
    const moduleItems = data.modules || [];
    document.getElementById("module-count").textContent = String(moduleItems.length);
    for (const module of moduleItems.slice(0, 10)) {
      const item = makeElement("div", "module-summary");
      item.append(makeElement("strong", "", module.name || "Module"), makeElement("span", "", `${module.fileCount || 0} files`));
      modules.append(item);
    }

    const sourceLink = document.getElementById("repository-source-link");
    try {
      const parsed = new URL(source.repoUrl || "");
      if (parsed.protocol === "https:") {
        parsed.username = "";
        parsed.password = "";
        parsed.search = "";
        parsed.hash = "";
        sourceLink.href = parsed.href;
        sourceLink.hidden = false;
      }
    } catch {
      sourceLink.hidden = true;
    }
  }

  async function openFile(filePath, referenceLine = null) {
    const requestSequence = ++previewSequence;
    activePath = filePath;
    const selectedFile = fileIndex.find((file) => file.path === filePath);
    for (const button of filesPane.querySelectorAll("[data-file-path]")) {
      button.setAttribute("aria-current", String(button.dataset.filePath === filePath));
    }
    document.getElementById("active-file-name").textContent = filePath.split("/").pop();
    document.getElementById("file-breadcrumb").textContent = filePath;
    document.getElementById("file-type-mark").textContent = fileExtension(filePath);
    fileNotice.hidden = true;
    if (!selectedFile?.previewable) {
      document.getElementById("file-description").textContent = "Directory entry · text preview unavailable";
      codeLines.replaceChildren(makeElement("p", "code-empty", "This file is included in the repository structure but was not indexed as readable source text."));
      repository.activeContent = "";
      repository.activeFile = selectedFile || null;
      return;
    }
    const url = `/api/analysis/${encodeURIComponent(analysisId)}/file?${new URLSearchParams({ path: filePath })}`;
    document.getElementById("file-description").textContent = "Loading source preview...";
    codeLines.replaceChildren(makeElement("p", "code-empty", "Loading source preview..."));
    fileNotice.hidden = true;
    try {
      const payload = await requestJson(url);
      if (requestSequence !== previewSequence) return;
      const file = payload.file;
      document.getElementById("file-description").textContent = `${file.language} · ${file.module} · ${file.role}`;
      const fragment = document.createDocumentFragment();
      const lines = file.content.split(/\r?\n/);
      lines.forEach((line, index) => {
        const row = makeElement("div", "code-line");
        row.dataset.line = String(index + 1);
        row.append(makeElement("span", "line-number", String(index + 1)), makeElement("span", "line-content", line || " "));
        fragment.append(row);
      });
      codeLines.replaceChildren(fragment);
      const citedLine = Number(referenceLine);
      if (Number.isSafeInteger(citedLine) && citedLine > 0) {
        const referencedRow = codeLines.querySelector(`[data-line="${citedLine}"]`);
        if (referencedRow) {
          referencedRow.classList.add("is-referenced");
          const scrollPane = document.getElementById("code-scroll");
          scrollPane.scrollTop = Math.max(0, referencedRow.offsetTop - scrollPane.offsetTop - 90);
        }
      }
      if (file.truncated) {
        fileNotice.textContent = "This preview may stop at 12,000 characters. Re-run the analysis to refresh the source snapshot.";
        fileNotice.hidden = false;
      }
      repository.activeContent = file.content;
      repository.activeFile = file;
    } catch (error) {
      if (requestSequence !== previewSequence) return;
      document.getElementById("file-description").textContent = "Preview unavailable";
      codeLines.replaceChildren(makeElement("p", "code-empty", error.message));
    }
  }

  document.addEventListener("click", (event) => {
    const fileButton = event.target.closest("[data-file-path]");
    if (fileButton) openFile(fileButton.dataset.filePath);
  });

  searchInput.addEventListener("input", buildTree);
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") filesPane.querySelector("[data-file-path]")?.click();
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
      event.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  document.getElementById("copy-file").addEventListener("click", async () => {
    if (!repository?.activeContent) return;
    try {
      await navigator.clipboard.writeText(repository.activeContent);
      copyStatus.textContent = "Source preview copied.";
    } catch {
      copyStatus.textContent = "Clipboard access is unavailable in this browser.";
    }
    window.setTimeout(() => { copyStatus.textContent = ""; }, 2400);
  });

  async function start() {
    const params = new URLSearchParams(window.location.search);
    analysisId = params.get("analysisId") || "";
    if (!analysisId) {
      try { analysisId = window.localStorage.getItem("lumenstack-last-analysis-id") || ""; } catch { /* Storage can be disabled. */ }
    }
    if (!/^[a-f\d-]{36}$/i.test(analysisId)) {
      showState("Analyze a repository to open its source map", "The explorer opens the files and summary from a completed analysis.");
      return;
    }

    try {
      const data = await requestJson(`/api/analysis/${encodeURIComponent(analysisId)}`);
      fileIndex = data.files || [];
      repository = data;
      renderOverview(data);
      buildTree();
      state.hidden = true;
      workspace.hidden = false;
      const firstEntrypoint = (data.summary?.entrypoints || []).find((path) => fileIndex.some((file) => file.path === path));
      const requestedPath = params.get("path");
      const requestedFile = requestedPath && fileIndex.some((file) => file.path === requestedPath)
        ? requestedPath
        : "";
      const firstFile = requestedFile || firstEntrypoint || fileIndex[0]?.path;
      if (firstFile) await openFile(firstFile, params.get("line"));
    } catch (error) {
      showState("This analysis is no longer available", `${error.message} Start a new analysis to create a fresh source snapshot.`, true);
    }
  }

  start();
})();
