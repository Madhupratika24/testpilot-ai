import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, GitPullRequest } from "lucide-react";
import api from "../services/api";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

const stateStyles = {
  open: "bg-green-100 text-green-700",
  merged: "bg-purple-100 text-purple-700",
  closed: "bg-red-100 text-red-700",
};

export default function RepoPullRequests() {
  const { owner, repo } = useParams();
  const [state, setState] = useState("open");
  const [pulls, setPulls] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(nextPage) {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/github/repos/${owner}/${repo}/pulls`, {
        params: { state, page: nextPage },
      });
      setPulls((prev) => (nextPage === 1 ? res.data.items : [...prev, ...res.data.items]));
      setPage(nextPage);
      setHasNext(res.data.hasNext);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load Pull Requests");
      if (nextPage === 1) setPulls([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, repo, state]);

  return (
    <div className="space-y-5">
      <div>
        <Link to="/github" className="mb-2 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
          <ArrowLeft size={14} /> Back to repositories
        </Link>
        <h1 className="break-all text-2xl font-semibold">
          {owner}/{repo}
        </h1>
        <p className="text-sm text-slate-500">Pull Requests</p>
      </div>

      <div className="flex gap-2">
        {["open", "closed", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setState(s)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
              state === s
                ? "bg-indigo-600 text-white"
                : "border border-slate-300 bg-white hover:bg-slate-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <ErrorMessage message={error} />

      {loading && pulls.length === 0 && <LoadingSpinner text="Loading Pull Requests..." />}

      {!loading && !error && pulls.length === 0 && (
        <EmptyState
          icon={GitPullRequest}
          title={`No ${state === "all" ? "" : state + " "}Pull Requests`}
          text="Create a Pull Request on GitHub and it will appear here."
        />
      )}

      {pulls.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
          {pulls.map((pr) => (
            <li key={pr.number} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                      stateStyles[pr.state] || "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {pr.draft ? "draft" : pr.state}
                  </span>
                  <span className="break-words">
                    #{pr.number} {pr.title}
                  </span>
                </p>
                <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  {pr.authorAvatar && <img src={pr.authorAvatar} alt="" className="h-4 w-4 rounded-full" />}
                  {pr.author} · {pr.headRef} → {pr.baseRef} · Updated{" "}
                  {new Date(pr.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={pr.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  GitHub <ExternalLink size={14} />
                </a>
                <Link
                  to={`/github/${owner}/${repo}/pulls/${pr.number}`}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Review &amp; analyze
                </Link>
              </div>
            </li>
          ))}
        </ul>
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