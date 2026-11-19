import Analysis from "../models/Analysis.js";
import { GithubError } from "../services/github/githubClient.js";
import { getGithubToken } from "../services/github/connection.js";
import {
  MAX_ANALYZED_FILES,
  fetchPullRequestData,
  isValidName,
  loadFileContent,
} from "../services/github/pullRequest.js";
import { parsePatch } from "../services/github/diff.js";
import { runStaticAnalysis } from "../services/analyzers/index.js";
import { reviewPullRequest } from "../services/ai/reviewPullRequest.js";
import { AiError } from "../services/ai/AiError.js";
import { calculateScore } from "../utils/score.js";

function sendGithubError(err, res, next) {
  if (err instanceof GithubError) {
    return res.status(err.httpStatus).json({ message: err.message, code: err.code });
  }
  next(err);
}

function readParams(owner, repo, rawNumber) {
  const number = Number(rawNumber);
  if (!isValidName(owner) || !isValidName(repo) || !Number.isInteger(number) || number < 1) {
    return null;
  }
  return { number };
}

// Shows a Pull Request and which of its files will be analyzed
export async function getPullRequestDetails(req, res, next) {
  try {
    const { owner, repo } = req.params;
    const parsed = readParams(owner, repo, req.params.number);
    if (!parsed) return res.status(400).json({ message: "Invalid Pull Request address" });

    const token = await getGithubToken(req.user._id);
    const { pr, files, truncated } = await fetchPullRequestData(token, owner, repo, parsed.number);

    let queued = 0;
    const list = files.map((f) => {
      let willAnalyze = false;
      let skipReason = f.skipReason || "";
      if (f.supported) {
        if (queued < MAX_ANALYZED_FILES) {
          willAnalyze = true;
          queued++;
        } else {
          skipReason = `Skipped: only the first ${MAX_ANALYZED_FILES} supported files are analyzed`;
        }
      }
      return {
        path: f.path,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        language: f.language || null,
        willAnalyze,
        skipReason,
      };
    });

    res.json({
      pr: {
        number: pr.number,
        title: pr.title,
        state: pr.merged_at ? "merged" : pr.state,
        draft: Boolean(pr.draft),
        author: pr.user?.login,
        authorAvatar: pr.user?.avatar_url,
        headRef: pr.head?.ref,
        baseRef: pr.base?.ref,
        htmlUrl: pr.html_url,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changed_files,
        commits: pr.commits,
      },
      files: list,
      truncated,
      willAnalyzeCount: queued,
    });
  } catch (err) {
    sendGithubError(err, res, next);
  }
}

// Runs ESLint or Ruff on each file. Only findings on changed lines are kept.
async function runStaticForFiles(files) {
  const findings = [];
  const errors = new Set();
  const hidden = new Map();

  for (const file of files) {
    try {
      const results = await runStaticAnalysis(file.language, file.content);
      let hiddenCount = 0;
      for (const r of results) {
        const changed = file.addedLines.has(r.line);
        // Syntax errors are always kept, because they usually come from the change
        if (changed || r.severity === "critical") {
          findings.push({ ...r, file: file.path, inChangedLines: changed });
        } else {
          hiddenCount++;
        }
      }
      hidden.set(file.path, hiddenCount);
    } catch (err) {
      errors.add(`${file.path}: ${err.message || "static analysis could not be run"}`);
    }
  }

  return {
    findings: findings.slice(0, 300),
    staticError: [...errors].join(" ").slice(0, 500),
    hidden,
  };
}

function skippedRecord(f, reason) {
  return {
    path: f.path,
    language: f.language,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    analyzed: false,
    skipReason: reason,
  };
}

// Analyzes a Pull Request and saves the result
export async function analyzePullRequest(req, res, next) {
  try {
    const { owner, repo } = req.body || {};
    const parsed = readParams(owner, repo, req.body?.number);
    if (!parsed) return res.status(400).json({ message: "Invalid Pull Request" });
    const { number } = parsed;

    const token = await getGithubToken(req.user._id);
    const { pr, files } = await fetchPullRequestData(token, owner, repo, number);

    // 1. Choose the files to analyze
    const selected = [];
    const recordsByPath = new Map();
    for (const f of files) {
      if (f.supported && selected.length < MAX_ANALYZED_FILES) {
        selected.push(f);
      } else {
        const reason = f.supported
          ? `Skipped: only the first ${MAX_ANALYZED_FILES} supported files are analyzed`
          : f.skipReason;
        recordsByPath.set(f.path, skippedRecord(f, reason));
      }
    }
    if (selected.length === 0) {
      return res
        .status(400)
        .json({ message: "This Pull Request has no JavaScript or Python files that can be analyzed." });
    }

    // 2. Download the files as they are in the latest commit
    const loaded = await Promise.all(
      selected.map(async (f) => {
        try {
          const result = await loadFileContent(token, owner, repo, f.path, pr.head.sha);
          return { f, ...result };
        } catch (err) {
          // A bad token or the request limit affects everything, so stop
          if (err instanceof GithubError && ["reconnect", "rate_limit"].includes(err.code)) throw err;
          return { f, skipReason: err instanceof GithubError ? err.message : "Could not download this file" };
        }
      })
    );

    const analyzed = [];
    for (const item of loaded) {
      if (item.skipReason) {
        recordsByPath.set(item.f.path, skippedRecord(item.f, item.skipReason));
      } else {
        analyzed.push({
          ...item.f,
          content: item.content,
          lines: item.content.split(/\r?\n/),
          addedLines: parsePatch(item.f.patch),
        });
      }
    }
    if (analyzed.length === 0) {
      return res.status(400).json({ message: "None of the files could be downloaded from GitHub." });
    }

    // 3. Static analysis and AI review at the same time
    const [staticResult, aiResult] = await Promise.allSettled([
      runStaticForFiles(analyzed),
      reviewPullRequest(analyzed),
    ]);

    let staticFindings = [];
    let staticError = "";
    let hidden = new Map();
    if (staticResult.status === "fulfilled") {
      staticFindings = staticResult.value.findings;
      staticError = staticResult.value.staticError;
      hidden = staticResult.value.hidden;
    } else {
      staticError = "Static analysis could not be run.";
      console.error("Static analysis failed:", staticResult.reason?.message);
    }

    let aiFindings = [];
    let aiError = "";
    let reviewedIndexes = [];
    if (aiResult.status === "fulfilled") {
      aiFindings = aiResult.value.findings;
      reviewedIndexes = aiResult.value.reviewedIndexes;
    } else {
      aiError =
        aiResult.reason instanceof AiError
          ? aiResult.reason.message
          : "The AI review could not be completed.";
    }

    // 4. Save the result
    analyzed.forEach((f, i) => {
      recordsByPath.set(f.path, {
        path: f.path,
        language: f.language,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        analyzed: true,
        aiReviewed: reviewedIndexes.includes(i),
        hiddenFindings: hidden.get(f.path) || 0,
        patch: f.patch,
        content: f.content,
        addedLines: [...f.addedLines],
      });
    });
    const fileRecords = files.map((f) => recordsByPath.get(f.path)).filter(Boolean).slice(0, 150);

    let status = "completed";
    if (staticError && aiError) status = "failed";
    else if (staticError || aiError) status = "partial";

    const languages = [...new Set(analyzed.map((f) => f.language))];

    const analysis = await Analysis.create({
      userId: req.user._id,
      source: "github_pr",
      projectName: `${repo} #${number}`.slice(0, 100),
      language: languages.length > 1 ? "mixed" : languages[0],
      github: {
        repoFullName: pr.base?.repo?.full_name || `${owner}/${repo}`,
        prNumber: number,
        prTitle: String(pr.title || "").slice(0, 300),
        prUrl: pr.html_url,
        prAuthor: pr.user?.login,
        baseBranch: pr.base?.ref,
        headBranch: pr.head?.ref,
        headSha: pr.head?.sha,
      },
      files: fileRecords,
      staticFindings,
      staticError,
      aiFindings,
      aiError,
      qualityScore: status === "failed" ? null : calculateScore([...staticFindings, ...aiFindings]),
      status,
    });

    res.status(201).json({
      analysis: { _id: analysis._id, projectName: analysis.projectName, status: analysis.status },
    });
  } catch (err) {
    sendGithubError(err, res, next);
  }
}