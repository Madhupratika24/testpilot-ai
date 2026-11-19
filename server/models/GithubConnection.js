import mongoose from "mongoose";

const githubConnectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true, // one GitHub connection per user
  },
  githubId: Number,
  login: String,
  avatarUrl: String,
  scope: { type: String, default: "" },
  // The GitHub token is stored ENCRYPTED. "select: false" means it is never
  // returned by a normal query, only when the code asks for it on purpose.
  accessTokenEnc: { type: String, required: true, select: false },
  expiresAt: { type: Date, default: null },
  connectedAt: { type: Date, default: Date.now },
});

export default mongoose.model("GithubConnection", githubConnectionSchema);