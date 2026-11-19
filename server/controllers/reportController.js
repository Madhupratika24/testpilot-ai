import mongoose from "mongoose";
import Analysis from "../models/Analysis.js";
import { buildReport } from "../services/reports/pdfReport.js";

export async function downloadPdf(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Analysis not found" });
    }
    // The userId in the filter makes sure you can only download your own reports
    const analysis = await Analysis.findOne({ _id: req.params.id, userId: req.user._id }).select("-files.patch");
    if (!analysis) {
      return res.status(404).json({ message: "Analysis not found" });
    }

    const doc = buildReport(analysis.toObject());
    const safeName = String(analysis.projectName).replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 60) || "analysis";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="testpilot-report-${safeName}.pdf"`);
    doc.pipe(res);
    doc.end();
  } catch (err) {
    if (res.headersSent) {
      res.destroy(err);
      return;
    }
    next(err);
  }
}