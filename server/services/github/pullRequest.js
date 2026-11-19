import { githubFetch } from "./githubClient.js";

export const MAX_ANALYZED_FILES = 15;
export const MAX_FILE_BYTES = 100000;

const LANGUAGES = { js: "javascript", mjs: "javascript", py: "python" };

// Repository and owner names may only contain letters, numbers, _ . and -
export function isValidName(name) {
  return typeof name === "string" && /^[A-Za-z0-9_.-]{1,100}$/.test(name) && !/^\.{1,2}$/.test(name);
}

function languageFor(path) {
  const match = /\.([A-Za-z0-9]+)$/.exec(path);
  return match ? LANGUAGES[match[1].toLowerCase()] : undefined;
}

// Decides whether a changed file can be analyzed, and why not if it can't
export function classifyFile(file) {
  const base = {
    path: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
  };

  if (file.status === "removed") {
    return { ...base, supported: false, skipReason: "The file was deleted" };
  }
  const language = languageFor(file.filename);
  if (!language) {
    return { ...base, supported: false, skipReason: "File type not supported yet (only .js, .mjs and .py)" };
  }
  if (/(^|\/)(node_modules|dist|build|vendor)\//.test(file.filename) || /\.min\.js$/.test(file.filename)) {
    return { ...base, language, supported: false, skipReason: "Generated or third-party file" };
  }
  if (!file.patch) {
    return {
      ...base,
      language,
      supported: false,
      skipReason: "GitHub did not provide the changes for this file (nothing changed, or the diff is too large)",
    };
  }
  return { ...base, language, supported: true, patch: file.patch };
}

function pullPath(owner, repo, number) {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}`;
}

// Gets the Pull Request details and its changed files (up to 300)
export async function fetchPullRequestData(token, owner, repo, number) {
  const base = pullPath(owner, repo, number);
  const { data: pr } = await githubFetch(token, base);

  const rawFiles = [];
  let truncated = false;
  for (let page = 1; page <= 3; page++) {
    const { data } = await githubFetch(token, `${base}/files`, { per_page: 100, page });
    rawFiles.push(...data);
    if (data.length < 100) break;
    if (page === 3) truncated = true;
  }

  return { pr, files: rawFiles.map(classifyFile), truncated };
}

// Downloads one file as it is in the Pull Request's latest commit
export async function loadFileContent(token, owner, repo, path, ref) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const { data } = await githubFetch(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`,
    { ref }
  );

  if (Array.isArray(data) || data.type !== "file") {
    return { skipReason: "Not a regular file" };
  }
  if (data.encoding !== "base64" || typeof data.content !== "string") {
    return { skipReason: "GitHub did not return the file content (it may be too large)" };
  }
  if (data.size > MAX_FILE_BYTES) {
    return { skipReason: "The file is larger than 100 KB" };
  }

  const content = Buffer.from(data.content, "base64").toString("utf8");
  if (content.includes("\u0000")) {
    return { skipReason: "Binary file" };
  }
  return { content };
}