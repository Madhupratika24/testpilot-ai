import { Router } from "express";
import protect from "../middleware/auth.js";
import {
  getConnectUrl,
  callback,
  getStatus,
  disconnect,
  listRepos,
  listPullRequests,
} from "../controllers/githubController.js";
import { getPullRequestDetails } from "../controllers/pullRequestController.js";

const router = Router();

// GitHub sends the browser here, so there is no login token. The signed "state" proves who it is.
router.get("/callback", callback);

router.get("/connect-url", protect, getConnectUrl);
router.get("/status", protect, getStatus);
router.delete("/connection", protect, disconnect);
router.get("/repos", protect, listRepos);
router.get("/repos/:owner/:repo/pulls", protect, listPullRequests);
router.get("/repos/:owner/:repo/pulls/:number", protect, getPullRequestDetails);

export default router;