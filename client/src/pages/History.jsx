import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { History as HistoryIcon, Trash2 } from "lucide-react";
import api from "../services/api";
import ConfirmationModal from "../components/ConfirmationModal.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

const languageNames = { javascript: "JavaScript", python: "Python", mixed: "Mixed" };
const statusStyles = {
  completed: "bg-green-100 text-green-700",
  partial: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  pending: "bg-slate-100 text-slate-600",
};
const inputClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function History() {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [language, setLanguage] = useState("");
  const [source, setSource] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Wait a moment after typing before searching
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get("/analyses", { params: { q, language, source, from, to, page, limit: 10 } })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load your history"))
      .finally(() => setLoading(false));
  }, [q, language, source, from, to, page, reload]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/analyses/${deleteTarget._id}`);
      setDeleteTarget(null);
      if (data.items.length === 1 && page > 1) setPage(page - 1);
      else setReload((n) => n + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete this analysis");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setQ("");
    setLanguage("");
    setSource("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  const hasFilters = Boolean(q || language || source || from || to);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Analysis History</h1>
        <p className="text-sm text-slate-500">All your previous analyses.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name"
          className={`${inputClass} lg:col-span-2`}
        />
        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPage(1);
          }}
          className={inputClass}
        >
          <option value="">All types</option>
          <option value="github_pr">Pull Requests</option>
          <option value="manual">Manual code</option>
        </select>
        <select
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            setPage(1);
          }}
          className={inputClass}
        >
          <option value="">All languages</option>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
        </select>
        <button onClick={clearFilters} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
          Clear filters
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className={inputClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className={inputClass}
          />
        </label>
      </div>

      <ErrorMessage message={error} />

      {loading && !data && <LoadingSpinner />}

      {data && data.total === 0 && (
        <EmptyState
          icon={HistoryIcon}
          title={hasFilters ? "No analyses match your filters" : "No analyses yet"}
          text={
            hasFilters
              ? "Try different filters or clear them."
              : "Analyze a Pull Request or some code, and it will appear here."
          }
        >
          {hasFilters ? (
            <button onClick={clearFilters} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Clear filters
            </button>
          ) : (
            <Link to="/github" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Go to GitHub PRs
            </Link>
          )}
        </EmptyState>
      )}

      {data && data.total > 0 && (
        <>
          <div className={`overflow-x-auto rounded-2xl border border-slate-200 bg-white ${loading ? "opacity-60" : ""}`}>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Language</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Findings</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => {
                  const isPr = a.source === "github_pr";
                  return (
                    <tr key={a._id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3">
                        <p className="break-words font-medium">
                          {isPr ? `${a.github?.repoFullName} #${a.github?.prNumber}` : a.projectName}
                        </p>
                        {isPr && a.github?.prTitle && (
                          <p className="text-xs text-slate-500">{a.github.prTitle}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            isPr ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isPr ? "Pull Request" : "Manual"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{languageNames[a.language] || a.language}</td>
                      <td className="whitespace-nowrap px-4 py-3">{new Date(a.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{a.findingsCount}</td>
                      <td className="px-4 py-3">{a.qualityScore ?? "-"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            statusStyles[a.status] || statusStyles.pending
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex gap-2">
                          <Link
                            to={`/review/${a._id}`}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                          >
                            View results
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(a)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <span>
              {data.total} {data.total === 1 ? "analysis" : "analyses"} · Page {data.page} of {data.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= data.pages}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      <ConfirmationModal
        open={Boolean(deleteTarget)}
        title="Delete this analysis?"
        text="The analysis, its findings, test cases and improvements will be deleted. This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}