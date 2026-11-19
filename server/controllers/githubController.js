import jwt from "jsonwebtoken";
import GithubConnection from "../models/GithubConnection.js";
import { encrypt, decrypt } from "../utils/crypto.js";
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  fetchGithubUser,
  githubFetch,
  revokeToken,
  GithubError,
} from "../services/github/githubClient.js";
import { getGithubToken } from "../services/github/connection.js";

function isConfigured() {
  return Boolean(
    process.env.GITHUB_CLIENT_ID &&
      process.env.GITHUB_CLIENT_SECRET &&
      process.env.GITHUB_CALLBACK_URL &&
      /^[0-9a-fA-F]{64}$/.test(process.env.GITHUB_TOKEN_KEY || "")
  );
}

// Repository and owner names may only contain letters, numbers, _ . and -
function isValidName(name) {
  return /^[A-Za-z0-9_.-]{1,100}$/.test(name) && !/^\.{1,2}$/.test(name);
}

function sendGithubError(err, res, next) {
  if (err instanceof GithubError) {
    return res.status(err.httpStatus).json({ message: err.message, code: err.code });
  }
  next(err);
}

// Step 1: the browser asks for the GitHub sign-in address
export function getConnectUrl(req, res) {
  if (!isConfigured()) {
    return res.status(503).json({
      message: "GitHub connection is not set up on the server. Check the GitHub values in server/.env.",
    });
  }
  // "state" is a short-lived signed note that says which user started this.
  // GitHub sends it back, so we know the sign-in belongs to this user.
  const state = jwt.sign({ id: String(req.user._id), purpose: "github-oauth" }, process.env.JWT_SECRET, {
    expiresIn: "10m",
  });
  res.json({ url: buildAuthorizeUrl(state) });
}

// Step 2: GitHub sends the browser back here with a one-time code
export async function callback(req, res) {
  const client = process.env.CLIENT_URL || "http://localhost:5173";
  const back = (query) => res.redirect(`${client}/github?${new URLSearchParams(query)}`);

  try {
    if (req.query.error) return back({ error: "denied" });

    const { code, state } = req.query;
    if (typeof code !== "string" || typeof state !== "string") return back({ error: "invalid" });

    let payload;
    try {
      payload = jwt.verify(state, process.env.JWT_SECRET);
    } catch {
      return back({ error: "expired" });
    }
    if (payload.purpose !== "github-oauth") return back({ error: "invalid" });

    const token = await exchangeCodeForToken(code);
    const githubUser = await fetchGithubUser(token.access_token);

    await GithubConnection.findOneAndUpdate(
      { userId: payload.id },
      {
        userId: payload.id,
        githubId: githubUser.id,
        login: githubUser.login,
        avatarUrl: githubUser.avatar_url,
        scope: token.scope || "",
        accessTokenEnc: encrypt(token.access_token),
        expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
        connectedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    back({ connected: "1" });
  } catch (err) {
    console.error("GitHub callback failed:", err.message);
    back({ error: "failed" });
  }
}

// Tells the browser whether GitHub is connected (never includes the token)
export async function getStatus(req, res, next) {
  try {
    const connection = await GithubConnection.findOne({ userId: req.user._id });
    if (!connection) {
      return res.json({ connected: false, configured: isConfigured() });
    }
    res.json({
      connected: true,
      configured: true,
      login: connection.login,
      avatarUrl: connection.avatarUrl,
      scope: connection.scope,
      connectedAt: connection.connectedAt,
      expired: Boolean(connection.expiresAt && connection.expiresAt < new Date()),
    });
  } catch (err) {
    next(err);
  }
}

export async function disconnect(req, res, next) {
  try {
    const connection = await GithubConnection.findOneAndDelete({ userId: req.user._id }).select(
      "+accessTokenEnc"
    );

    // Also ask GitHub to cancel the token. If this fails, the saved copy is already gone.
    if (connection) {
      try {
        await revokeToken(decrypt(connection.accessTokenEnc));
      } catch (err) {
        console.error("Could not revoke the GitHub token:", err.message);
      }
    }
    res.json({ message: "GitHub disconnected" });
  } catch (err) {
    next(err);
  }
}

// Lists the repositories the user can access (30 per page)
export async function listRepos(req, res, next) {
  try {
    const token = await getGithubToken(req.user._id);
    const page = Math.min(Math.max(parseInt(req.query.page) || 1, 1), 100);

    const { data, link } = await githubFetch(token, "/user/repos", {
      sort: "updated",
      per_page: 30,
      page,
      affiliation: "owner,collaborator,organization_member",
    });

    res.json({
      items: data.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        owner: r.owner?.login,
        private: r.private,
        description: r.description,
        language: r.language,
        updatedAt: r.updated_at,
        htmlUrl: r.html_url,
      })),
      page,
      hasNext: /rel="next"/.test(link),
    });
  } catch (err) {
    sendGithubError(err, res, next);
  }
}

// Lists the Pull Requests of one repository (20 per page)
export async function listPullRequests(req, res, next) {
  try {
    const { owner, repo } = req.params;
    if (!isValidName(owner) || !isValidName(repo)) {
      return res.status(400).json({ message: "Invalid repository name" });
    }

    const token = await getGithubToken(req.user._id);
    const page = Math.min(Math.max(parseInt(req.query.page) || 1, 1), 100);
    const state = ["open", "closed", "all"].includes(req.query.state) ? req.query.state : "open";

    const { data, link } = await githubFetch(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
      { state, sort: "updated", direction: "desc", per_page: 20, page }
    );

    res.json({
      items: data.map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.merged_at ? "merged" : pr.state,
        draft: Boolean(pr.draft),
        author: pr.user?.login,
        authorAvatar: pr.user?.avatar_url,
        headRef: pr.head?.ref,
        baseRef: pr.base?.ref,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        htmlUrl: pr.html_url,
      })),
      page,
      hasNext: /rel="next"/.test(link),
    });
  } catch (err) {
    sendGithubError(err, res, next);
  }
}