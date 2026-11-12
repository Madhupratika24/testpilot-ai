import mongoose from "mongoose";

const severities = ["critical", "high", "medium", "low", "info"];

// A result from a real tool (ESLint / Ruff)
const staticFindingSchema = new mongoose.Schema(
  {
    ruleId: String,
    title: String,
    severity: { type: String, enum: severities, default: "low" },
    message: String,
    line: Number,
    column: Number,
    snippet: String,
  },
  { _id: false }
);

// A suggestion from the AI (a possible issue, not a proven bug)
const aiFindingSchema = new mongoose.Schema(
  {
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

const analysisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  projectName: { type: String, required: true, trim: true, maxlength: 100 },
  sourceCode: { type: String, required: true, maxlength: 200000 },
  language: { type: String, required: true, enum: ["javascript", "python"] },
  staticFindings: { type: [staticFindingSchema], default: [] },
  aiFindings: { type: [aiFindingSchema], default: [] },
  testCases: { type: [testCaseSchema], default: [] },
  improvedCode: { type: String, default: "" },
  qualityScore: { type: Number, min: 0, max: 100, default: null },
  // partial = static analysis worked but the AI review did not
  status: { type: String, enum: ["pending", "completed", "partial", "failed"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

analysisSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Analysis", analysisSchema);