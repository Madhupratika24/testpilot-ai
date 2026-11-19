import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Play } from "lucide-react";
import api from "../services/api";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

export default function PullRequestDetails() {
  const { owner, repo, number } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  useEffect(() => {
    setData(null);
    setError("");
    api
      .get(`/github/repos/${owner}/${repo}/pulls/${number}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load this Pull Request"));
  }, [owner, repo, number]);

  async function handleAnalyze() {
    setAnalyzeError("");
    setAnalyzing(true);
    try {
      const res = await api.post(
        "/analyses/pull-request",
        { owner, repo, number: Number(number) },
        { timeout: 240000 } // the AI review can take a while
      );
      navigate(`/review/${res.data.analysis._id}`);
    } catch (err) {
      setAnalyzeError(err.response?.data?.message || "The analysis failed. Is the server running?");
      setAnalyzing(false);
    }
  }

  const back = (
    <Link
      to={`/github/${owner}/${repo}`}
      className="mb-2 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
    >
      <ArrowLeft size={14} /> Back to Pull Requests
    </Link>
  );

  if (error) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorMessage message={error} />
      </div>
    );
  }
  if (!data) return <LoadingSpinner text="Loading Pull Request..." />;

  const { pr, files } = data;

  return (
    <div className="space-y-5">
      <div>
        {back}
        <h1 className="break-words text-2xl font-semibold">
          #{pr.number} {pr.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {owner}/{repo} · {pr.author} · {pr.headRef} → {pr.baseRef} ·{" "}
          <a
            href={pr.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
          >
            Open on GitHub <ExternalLink size={12} />
          </a>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Changed files</p>
          <p className="text-3xl font-semibold">{pr.changedFiles}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Lines changed</p>
          <p className="text-3xl font-semibold">
            <span className="text-green-600">+{pr.additions}</span>{" "}
            <span className="text-red-600">-{pr.deletions}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Files that will be analyzed</p>
          <p className="text-3xl font-semibold">{data.willAnalyzeCount}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">File</th>
              <th className="px-4 py-3 font-medium">Changes</th>
              <th className="px-4 py-3 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.path} className="border-t border-slate-100 align-top">
                <td className="break-all px-4 py-3 font-mono text-xs">{f.path}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="text-green-600">+{f.additions}</span>{" "}
                  <span className="text-red-600">-{f.deletions}</span>
                </td>
                <td className="px-4 py-3">
                  {f.willAnalyze ? (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Will be analyzed
                    </span>
                  ) : (
                    <span className="text-slate-500">{f.skipReason || "Skipped"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.truncated && (
        <p className="text-sm text-amber-700">
          This Pull Request has more than 300 files. Only the first 300 are listed.
        </p>
      )}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        The changed code is sent to Google's Gemini AI service for the AI review. Only analyze code
        that is public or that you are allowed to share.
      </div>

      <ErrorMessage message={analyzeError} />

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleAnalyze}
          disabled={analyzing || data.willAnalyzeCount === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          <Play size={16} /> {analyzing ? "Analyzing..." : "Analyze this Pull Request"}
        </button>
        {analyzing && (
          <span className="text-sm text-slate-500">
            This can take up to a minute or two. Please keep this page open.
          </span>
        )}
        {data.willAnalyzeCount === 0 && (
          <span className="text-sm text-slate-500">
            There are no JavaScript or Python files to analyze in this Pull Request.
          </span>
        )}
      </div>
    </div>
  );
}