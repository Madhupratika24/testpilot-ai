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

const router = Router();

router.use(protect); // every route below needs a logged-in user

// Each analysis calls the AI, so limit how often one user can start one
const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => String(req.user._id),
  message: { message: "Too many analyses. Please try again in an hour." },
});

router.post("/pull-request", analyzeLimiter, analyzePullRequest);
router.post("/", analyzeLimiter, createAnalysis);
router.get("/", listAnalyses);
router.get("/:id", getAnalysis);
router.delete("/:id", deleteAnalysis);

export default router;