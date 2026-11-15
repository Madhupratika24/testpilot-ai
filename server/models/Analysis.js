import mongoose from "mongoose";

const severities = ["critical", "high", "medium", "low", "info"];

// A result from a real tool (ESLint / Ruff)
const staticFindingSchema = new mongoose.Schema(
  {
    file: String, // file path (used for Pull Request analyses)
    ruleId: String,
    title: String,
    severity: { type: String, enum: severities, default: "low" },
    message: String,
    line: Number,
    column: Number,
    snippet: String,
    recommendation: String,
  },
  { _id: false }
);

// A suggestion from the AI (a possible issue, not a proven bug)
const aiFindingSchema = new mongoose.Schema(
  {
    file: String,
    title: String,
    category: String,
    severity: { type: String, enum: severities, default: "info" },
    description: String,
    line: Number,
    snippet: String,
    whyItMatters: String,
    recommendation: String,
  },
  { _id: false }
);

const testCaseSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    input: String,
    expectedOutput: String,
    type: { type: String, enum: ["normal", "edge", "boundary", "invalid"], default: "normal" },
  },
  { _id: false }
);

// Details about the GitHub Pull Request (only for source = "github_pr")
const githubSchema = new mongoose.Schema(
  {
    repoFullName: String,
    prNumber: Number,
    prTitle: String,
    prUrl: String,
    prAuthor: String,
    baseBranch: String,
    headBranch: String,
    headSha: String,
  },
  { _id: false }
);

// The files of a Pull Request and whether we analyzed them
const fileSchema = new mongoose.Schema(
  {
    path: String,
    status: String,
    additions: Number,
    deletions: Number,
    analyzed: { type: Boolean, default: false },
    skipReason: String,
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  // manual = pasted/uploaded code, github_pr = a GitHub Pull Request
  source: { type: String, enum: ["manual", "github_pr"], default: "manual" },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: function () {
      return this.source === "manual";
    },
  },
  projectName: { type: String, required: true, trim: true, maxlength: 100 },
  sourceCode: {
    type: String,
    maxlength: 200000,
    default: "",
    required: function () {
      return this.source === "manual";
    },
  },
  language: { type: String, required: true, enum: ["javascript", "python", "mixed"] },
  github: { type: githubSchema, default: undefined },
  files: { type: [fileSchema], default: [] },
  staticFindings: { type: [staticFindingSchema], default: [] },
  staticError: { type: String, default: "" }, // set when the checker could not run
  aiError: { type: String, default: "" }, // set when the AI review could not run
  aiFindings: { type: [aiFindingSchema], default: [] },
  aiError: { type: String, default: "" }, // set when the AI review could not run
  testCases: { type: [testCaseSchema], default: [] },
  improvedCode: { type: String, default: "" },
  qualityScore: { type: Number, min: 0, max: 100, default: null },
  // partial = static analysis worked but the AI review did not (or the other way round)
  status: { type: String, enum: ["pending", "completed", "partial", "failed"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

analysisSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Analysis", analysisSchema);