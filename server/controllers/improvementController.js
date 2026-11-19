import mongoose from "mongoose";
import Analysis from "../models/Analysis.js";
import { AiError } from "../services/ai/AiError.js";
import { improveCode } from "../services/ai/improveCode.js";
import { runStaticAnalysis } from "../services/analyzers/index.js";

const MAX_CODE_CHARS = 60000;

// Runs the real checker on some code. Nothing is executed.
async function checkCode(language, code) {
  try {
    const findings = await runStaticAnalysis(language, code);
    return {
      available: true,
      count: findings.length,
      syntaxError: findings.some((f) => f.ruleId === "syntax-error"),
    };
  } catch {
    return { available: false };
  }
}

export async function improveAnalysis(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Analysis not found" });
    }
    // The userId in the filter makes sure you can only use your own analyses
    const analysis = await Analysis.findOne({ _id: req.params.id, userId: req.user._id });
    if (!analysis) {
      return res.status(404).json({ message: "Analysis not found" });
    }

    const isPr = analysis.source === "github_pr";
    let language;
    let original;
    let filePath = "";
    let changedLines = [];
    let staticFindings;
    let aiFindings;

    if (isPr) {
      const wanted = String(req.body?.path || "");
      const file = (analysis.files || []).find((f) => f.path === wanted && f.analyzed && f.content);
      if (!file) {
        return res.status(400).json({ message: "Choose one of the analyzed files." });
      }
      language = file.language;
      original = file.content;
      filePath = file.path;
      changedLines = file.addedLines || [];
      staticFindings = (analysis.staticFindings || []).filter((f) => f.file === file.path);
      aiFindings = (analysis.aiFindings || []).filter((f) => f.file === file.path);
    } else {
      language = analysis.language;
      original = analysis.sourceCode;
      staticFindings = analysis.staticFindings || [];
      aiFindings = analysis.aiFindings || [];
    }

    if (!original || !original.trim()) {
      return res.status(400).json({ message: "There is no code to improve." });
    }
    if (original.length > MAX_CODE_CHARS) {
      return res
        .status(400)
        .json({ message: "This file is too long for an automatic improvement (maximum 60,000 characters)." });
    }

    const result = await improveCode({
      language,
      fileName: filePath,
      code: original,
      changedLines,
      staticFindings,
      aiFindings,
    });

    // Check the original and the improved code with the real tool
    const [before, after] = await Promise.all([
      checkCode(language, original),
      checkCode(language, result.improvedCode),
    ]);
    const check =
      before.available && after.available
        ? {
            checked: true,
            originalIssues: before.count,
            improvedIssues: after.count,
            improvedSyntaxError: after.syntaxError,
          }
        : { checked: false };

    const record = {
      file: filePath,
      summary: result.summary,
      improvedCode: result.improvedCode,
      changes: result.changes,
      check,
      createdAt: new Date(),
    };

    // Keep one improvement per file; a new one replaces the old one
    analysis.improvements = (analysis.improvements || []).filter((i) => (i.file || "") !== filePath);
    analysis.improvements.push(record);
    await analysis.save();

    res.json({ improvement: record });
  } catch (err) {
    if (err instanceof AiError) {
      return res.status(502).json({ message: err.message });
    }
    next(err);
  }
}