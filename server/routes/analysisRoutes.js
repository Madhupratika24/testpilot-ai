import { Router } from "express";
import protect from "../middleware/auth.js";
import {
  createAnalysis,
  listAnalyses,
  getAnalysis,
  deleteAnalysis,
} from "../controllers/analysisController.js";

const router = Router();

router.use(protect); // every route below needs a logged-in user

router.post("/", createAnalysis);
router.get("/", listAnalyses);
router.get("/:id", getAnalysis);
router.delete("/:id", deleteAnalysis);

export default router;