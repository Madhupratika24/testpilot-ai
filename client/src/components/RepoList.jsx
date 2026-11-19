import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Globe, FolderGit2 } from "lucide-react";
import api from "../services/api";
import EmptyState from "./EmptyState.jsx";
import ErrorMessage from "./ErrorMessage.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";

export default function RepoList({ onReconnectNeeded }) {
  const [repos, setRepos] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  async function load(nextPage) {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/github/repos", { params: { page: nextPage } });
      setRepos((prev) => (nextPage === 1 ? res.data.items : [...prev, ...res.data.items]));
      setPage(nextPage);
      setHasNext(res.data.hasNext);
    } catch (err) {
      if (err.response?.data?.code === "reconnect") onReconnectNeeded?.();
      setError(err.response?.data?.message || "Could not load your repositories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = repos.filter((r) => r.fullName.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Your repositories</h2>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter loaded repositories"
          className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <p className="text-sm text-slate-500">
        Only public repositories are listed, because TestPilot AI asked for public access only.
      </p>

      <ErrorMessage message={error} />

      {loading && repos.length === 0 && <LoadingSpinner text="Loading repositories..." />}

      {!loading && !error && repos.length === 0 && (
        <EmptyState
          icon={FolderGit2}
          title="No repositories found"
          text="Create a public repository on GitHub and it will appear here."
        />
      )}

      {shown.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {shown.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  {r.private ? <Lock size={14} /> : <Globe size={14} />}
                  <span className="break-all">{r.fullName}</span>
                </p>
                {r.description && <p className="mt-1 text-sm text-slate-600">{r.description}</p>}
                <p className="mt-1 text-xs text-slate-500">
                  {r.language || "No language"} · Updated {new Date(r.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <Link
                to={`/github/${r.owner}/${r.name}`}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                View Pull Requests
              </Link>
            </li>
          ))}
        </ul>
      )}

      {repos.length > 0 && shown.length === 0 && (
        <p className="text-sm text-slate-500">No loaded repository matches your filter.</p>
      )}

      {hasNext && (
        <button
          onClick={() => load(page + 1)}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
}