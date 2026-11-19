import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import analysisRoutes from "./routes/analysisRoutes.js";
import githubRoutes from "./routes/githubRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Limit login/register attempts to slow down password guessing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});

app.get("/api/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    status: "ok",
    service: "TestPilot AI API",
    database: states[mongoose.connection.readyState],
    time: new Date().toISOString(),
  });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/analyses", analysisRoutes);
app.use("/api/github", githubRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set in server/.env");
    }
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET || !process.env.GITHUB_TOKEN_KEY) {
      console.warn("GitHub settings are missing in server/.env. Connecting GitHub will not work yet.");
    }
    await connectDB();
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

start();