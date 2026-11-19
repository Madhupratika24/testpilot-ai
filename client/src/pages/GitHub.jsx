import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { GitPullRequest } from "lucide-react";
import api from "../services/api";
import ConfirmationModal from "../components/ConfirmationModal.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import RepoList from "../components/RepoList.jsx";

const errorMessages = {
  denied: "You cancelled the GitHub connection.",
  expired: "The connection request expired. Please try again.",
  invalid: "The connection request was not valid. Please try again.",
  failed: "Connecting GitHub failed. Please try again.",
};

export default function GitHub() {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // GitHub sends the user back here with ?connected=1 or ?error=...
  useEffect(() => {
    const err = params.get("error");
    const connected = params.get("connected");
    if (err) setError(errorMessages[err] || errorMessages.failed);
    if (connected) setNotice("GitHub connected successfully.");
    if (err || connected) setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api
      .get("/github/status")
      .then((res) => setStatus(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load the GitHub status"));
  }, []);

  async function handleConnect() {
    setError("");
    setWorking(true);
    try {
      const res = await api.get("/github/connect-url");
      window.location.href = res.data.url; // go to GitHub
    } catch (err) {
      setError(err.response?.data?.message || "Could not start the GitHub connection");
      setWorking(false);
    }
  }

  async function handleDisconnect() {
    setWorking(true);
    try {
      await api.delete("/github/connection");
      setStatus({ connected: false, configured: true });
      setNotice("GitHub disconnected.");
      setConfirmOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || "Could not disconnect GitHub");
    } finally {
      setWorking(false);
    }
  }

  if (!status && !error) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">GitHub Pull Requests</h1>
        <p className="text-sm text-slate-500">
          Connect your GitHub account to analyze the code in your Pull Requests.
        </p>
      </div>

      <ErrorMessage message={error} />
      {notice && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {notice}
        </div>
      )}

      {status && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          {status.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {status.avatarUrl && (
                  <img src={status.avatarUrl} alt="" className="h-12 w-12 rounded-full" />
                )}
                <div>
                  <p className="font-medium">Connected as {status.login}</p>
                  <p className="text-sm text-slate-500">
                    Since {new Date(status.connectedAt).toLocaleDateString()} · Permission:{" "}
                    {status.scope || "none"}
                  </p>
                </div>
              </div>

              {status.expired && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Your GitHub connection has expired. Please reconnect.
                </p>
              )}

              <div className="flex gap-2">
                {status.expired && (
                  <button
                    onClick={handleConnect}
                    disabled={working}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    Reconnect
                  </button>
                )}
                <button
                  onClick={() => setConfirmOpen(true)}
                  disabled={working}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <GitPullRequest size={22} />
                </div>
                <div>
                  <p className="font-medium">GitHub is not connected</p>
                  <p className="text-sm text-slate-500">
                    You will be sent to GitHub to approve the connection.
                  </p>
                </div>
              </div>
              <button
                onClick={handleConnect}
                disabled={working}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {working ? "Opening GitHub..." : "Connect GitHub"}
              </button>
            </div>
          )}
        </div>
      )}

      {status?.connected && !status.expired && (
        <RepoList onReconnectNeeded={() => setStatus((s) => ({ ...s, expired: true }))} />
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        <h2 className="mb-2 font-semibold text-slate-800">What access does TestPilot AI get?</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>It asks for permission to read your public repositories and their Pull Requests.</li>
          <li>
            GitHub's connection type cannot give read-only access, so the permission also allows
            changes to public repositories. TestPilot AI only reads and never changes anything.
          </li>
          <li>The GitHub token is stored encrypted on the server. It is never sent to the browser or to the AI.</li>
          <li>You can disconnect at any time. This also cancels the token on GitHub.</li>
        </ul>
      </div>

      <ConfirmationModal
        open={confirmOpen}
        title="Disconnect GitHub?"
        text="TestPilot AI will forget your GitHub connection. Your saved analyses are not deleted."
        confirmLabel="Disconnect"
        loading={working}
        onConfirm={handleDisconnect}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}