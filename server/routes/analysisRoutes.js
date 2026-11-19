import { Router } from "express";
import rateLimit from "express-rate-limit";
import protect from "../middleware/auth.js";
import {
  createAnalysis,
  listAnalyses,
  getAnalysis,
  deleteAnalysis,
} from "../controllers/analysisController.js";
import { analyzePullRequest } from "../controllers/pullRequestController.js";
import { generateTestCases } from "../controllers/testCaseController.js";
import { improveAnalysis } from "../controllers/improvementController.js";

const router = Router();

router.use(protect); // every route below needs a logged-in user

// Each of these calls the AI, so limit how often one user can start one
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  keyGenerator: (req) => String(req.user._id),
  message: { message: "Too many requests to the AI. Please try again in an hour." },
});

router.post("/pull-request", aiLimiter, analyzePullRequest);
router.post("/", aiLimiter, createAnalysis);
router.get("/", listAnalyses);
router.post("/:id/test-cases", aiLimiter, generateTestCases);
router.post("/:id/improve", aiLimiter, improveAnalysis);
router.get("/:id", getAnalysis);
router.delete("/:id", deleteAnalysis);

export default router;