import mongoose from "mongoose";
import Analysis from "../models/Analysis.js";
import { AiError } from "../services/ai/AiError.js";
import { generateTestCasesFor } from "../services/ai/testCases.js";

const MAX_FILES = 8;

export async function generateTestCases(req, res, next) {
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
    let files;

    if (isPr) {
      files = (analysis.files || [])
        .filter((f) => f.analyzed && f.content)
        .slice(0, MAX_FILES)
        .map((f) => ({
          path: f.path,
          language: f.language,
          content: f.content,
          changedLines: f.addedLines || [],
        }));
    } else {
      files = [{ path: "", language: analysis.language, content: analysis.sourceCode }];
    }

    if (files.length === 0 || files.every((f) => !f.content)) {
      return res.status(400).json({ message: "This analysis has no code to write test cases for." });
    }

    const testCases = await generateTestCasesFor({ files, isPr });

    analysis.testCases = testCases;
    await analysis.save();

    res.json({ testCases });
  } catch (err) {
    if (err instanceof AiError) {
      return res.status(502).json({ message: err.message });
    }
    next(err);
  }
}