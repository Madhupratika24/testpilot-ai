const API = "https://api.github.com";

// An error whose message is safe to show to the user
export class GithubError extends Error {
  constructor(message, httpStatus = 502, code = "github_error") {
    super(message);
    this.httpStatus = httpStatus;
    this.code = code;
  }
}

export function buildAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: process.env.GITHUB_SCOPE || "public_repo",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

// Swaps the one-time code from GitHub for an access token
export async function exchangeCodeForToken(code) {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: process.env.GITHUB_CALLBACK_URL,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  if (!res.ok || data.error || !data.access_token) {
    throw new GithubError("GitHub did not accept the sign-in code.", 502);
  }
  return data;
}

// Makes one request to the GitHub API with the user's token
export async function githubFetch(token, path, query = {}) {
  const url = new URL(API + path);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));

  let res;
  try {
    res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "TestPilot-AI",
      },
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new GithubError("Could not reach GitHub. Check the internet connection.", 502);
  }

  if (res.status === 401) {
    throw new GithubError("GitHub rejected the saved connection. Please reconnect GitHub.", 409, "reconnect");
  }
  if (res.status === 403 || res.status === 429) {
    if (res.headers.get("x-ratelimit-remaining") === "0") {
      throw new GithubError("GitHub's request limit was reached. Please try again later.", 429, "rate_limit");
    }
    throw new GithubError("GitHub refused this request. You may not have access.", 403);
  }
  if (res.status === 404) {
    throw new GithubError("Not found on GitHub, or you do not have access to it.", 404, "not_found");
  }
  if (!res.ok) {
    throw new GithubError("GitHub returned an error. Please try again.", 502);
  }

  return { data: await res.json(), link: res.headers.get("link") || "" };
}

export async function fetchGithubUser(token) {
  const { data } = await githubFetch(token, "/user");
  return data;
}

// Tells GitHub to cancel the token (used when the user disconnects)
export async function revokeToken(token) {
  const id = process.env.GITHUB_CLIENT_ID;
  const basic = Buffer.from(`${id}:${process.env.GITHUB_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${API}/applications/${id}/token`, {
    method: "DELETE",
    headers: {
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      Authorization: `Basic ${basic}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "TestPilot-AI",
    },
    body: JSON.stringify({ access_token: token }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`GitHub returned ${res.status} when revoking the token`);
  }
}