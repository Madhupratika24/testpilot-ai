import GithubConnection from "../../models/GithubConnection.js";
import { decrypt } from "../../utils/crypto.js";
import { GithubError } from "./githubClient.js";

// Gets the user's decrypted GitHub token. It is only used on the server.
export async function getGithubToken(userId) {
  const connection = await GithubConnection.findOne({ userId }).select("+accessTokenEnc");

  if (!connection) {
    throw new GithubError("Connect your GitHub account first.", 409, "not_connected");
  }
  if (connection.expiresAt && connection.expiresAt < new Date()) {
    throw new GithubError("Your GitHub connection has expired. Please reconnect GitHub.", 409, "reconnect");
  }
  return decrypt(connection.accessTokenEnc);
}