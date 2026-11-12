import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  projectName: { type: String, required: true, trim: true, maxlength: 100 },
  language: { type: String, required: true, enum: ["javascript", "python"] },
  createdAt: { type: Date, default: Date.now },
});

// One project per user + name + language
projectSchema.index({ userId: 1, projectName: 1, language: 1 }, { unique: true });
projectSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Project", projectSchema);