import mongoose from "mongoose";
import Analysis from "../models/Analysis.js";
import Project from "../models/Project.js";
import { runStaticAnalysis } from "../services/analyzers/index.js";
import { reviewCode } from "../services/ai/geminiService.js";
import { AiError } from "../services/ai/AiError.js";
import { calculateScore } from "../utils/score.js";

const LANGUAGES = ["javascript", "python"];
const MAX_CODE_LENGTH = 100000;

const sizeOf = (field) => ({ $size: { $ifNull: [field, []] } });

// Makes user search text safe to use inside a database pattern
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function createAnalysis(req, res, next) {
  try {
    const projectName = String(req.body.projectName || "").trim();
    const language = String(req.body.language || "").toLowerCase();
    const sourceCode = typeof req.body.sourceCode === "string" ? req.body.sourceCode : "";

    if (!projectName || projectName.length > 100) {
      return res.status(400).json({ message: "Project name is required (maximum 100 characters)" });
    }
    if (!LANGUAGES.includes(language)) {
      return res.status(400).json({ message: "Language must be JavaScript or Python" });
    }
    if (!sourceCode.trim()) {
      return res.status(400).json({ message: "Please enter some code to analyze" });
    }
    if (sourceCode.length > MAX_CODE_LENGTH) {
      return res.status(400).json({ message: "Code is too long (maximum 100,000 characters)" });
    }

    // Run the static tools and the AI review at the same time.
    // If one of them fails, the other result is still kept.
    const [staticResult, aiResult] = await Promise.allSettled([
      runStaticAnalysis(language, sourceCode),
      reviewCode({ language, code: sourceCode }),
    ]);

    let staticFindings = [];
    let staticError = "";
    if (staticResult.status === "fulfilled") {
      staticFindings = staticResult.value;
    } else {
      staticError = staticResult.reason?.message || "Static analysis could not be run";
      console.error("Static analysis failed:", staticError);
    }

    let aiFindings = [];
    let aiError = "";
    if (aiResult.status === "fulfilled") {
      aiFindings = aiResult.value;
    } else {
      aiError =
        aiResult.reason instanceof AiError
          ? aiResult.reason.message
          : "The AI review could not be completed.";
    }

    // completed = both worked, partial = one worked, failed = neither worked
    let status = "completed";
    if (staticError && aiError) status = "failed";
    else if (staticError || aiError) status = "partial";

    const qualityScore =
      status === "failed" ? null : calculateScore([...staticFindings, ...aiFindings]);

    // Reuse the project if it exists, otherwise create it
    const project = await Project.findOneAndUpdate(
      { userId: req.user._id, projectName, language },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true, new: true }
    );

    const analysis = await Analysis.create({
      userId: req.user._id,
      source: "manual",
      projectId: project._id,
      projectName,
      language,
      sourceCode,
      staticFindings,
      staticError,
      aiFindings,
      aiError,
      qualityScore,
      status,
    });

    res.status(201).json({
      analysis: {
        _id: analysis._id,
        projectName: analysis.projectName,
        language: analysis.language,
        status: analysis.status,
        createdAt: analysis.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listAnalyses(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);

    const match = { userId: req.user._id };

    if (req.query.q) {
      match.projectName = { $regex: escapeRegex(String(req.query.q)), $options: "i" };
    }
    if (LANGUAGES.includes(req.query.language)) {
      match.language = req.query.language;
    }
    if (["manual", "github_pr"].includes(req.query.source)) {
      match.source = req.query.source;
    }

    const dateFilter = {};
    if (req.query.from) {
      const d = new Date(req.query.from);
      if (!isNaN(d)) dateFilter.$gte = d;
    }
    if (req.query.to) {
      const d = new Date(req.query.to);
      if (!isNaN(d)) {
        d.setHours(23, 59, 59, 999);
        dateFilter.$lte = d;
      }
    }
    if (Object.keys(dateFilter).length > 0) match.createdAt = dateFilter;

    const [total, items] = await Promise.all([
      Analysis.countDocuments(match),
      Analysis.aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $project: {
            projectName: 1,
            language: 1,
            source: 1,
            github: 1,
            qualityScore: 1,
            status: 1,
            createdAt: 1,
            findingsCount: { $add: [sizeOf("$staticFindings"), sizeOf("$aiFindings")] },
          },
        },
      ]),
    ]);

    res.json({ items, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
  } catch (err) {
    next(err);
  }
}

export async function getAnalysis(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Analysis not found" });
    }
    // The userId in the filter makes sure you can only open your own analyses
    const analysis = await Analysis.findOne({ _id: req.params.id, userId: req.user._id });
    if (!analysis) {
      return res.status(404).json({ message: "Analysis not found" });
    }
    res.json({ analysis });
  } catch (err) {
    next(err);
  }
}

export async function deleteAnalysis(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Analysis not found" });
    }
    const deleted = await Analysis.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!deleted) {
      return res.status(404).json({ message: "Analysis not found" });
    }
    res.json({ message: "Analysis deleted" });
  } catch (err) {
    next(err);
  }
}