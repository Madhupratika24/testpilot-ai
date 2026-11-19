import { Router } from "express";
import protect from "../middleware/auth.js";
import { downloadPdf } from "../controllers/reportController.js";

const router = Router();

router.get("/:id/pdf", protect, downloadPdf);

export default router;