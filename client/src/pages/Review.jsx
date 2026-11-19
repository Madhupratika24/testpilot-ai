import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ClipboardCheck, ExternalLink } from "lucide-react";
import api from "../services/api";
import CodeEditor from "../components/CodeEditor.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import FindingsTable from "../components/FindingsTable.jsx";
import SeverityBadge from "../components/SeverityBadge.jsx";
import DownloadReportButton from "../components/DownloadReportButton.jsx";

const languageNames = { javascript: "JavaScript", python: "Python", mixed: "JavaScript and Python" };
const toolNames = { javascript: "ESLint", python: "Ruff", mixed: "ESLint and Ruff" };
const severityOrder = ["critical", "high", "medium", "low", "info"];

function sortFindings(list) {
  return [...list].sort(
    (a, b) =>
      severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity) ||
      (a.line || 0) - (b.line || 0)
  );
}

function SeverityCounts({ findings }) {
  return (
    <div className="flex flex-wrap gap-3">
      {severityOrder.map((s) => (
        <div key={s} className="flex items-center gap-2 text-sm">
          <SeverityBadge severity={s} />
          <span className="font-medium">{findings.filter((f) => f.severity === s).length}</span>
        </div>
      ))}
    </div>
  );
}

// Groups findings by file, in the same order as the file list
function FindingsGroups({ findings, files, grouped }) {
  if (!grouped) return <FindingsTable findings={findings} />;

  const order = files.map((f) => f.path);
  const groups = new Map();
  findings.forEach((f) => {
    const key = f.file || "(unknown file)";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  });
  const sorted = [...groups.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));

  return sorted.map(([file, list]) => (
    <div key={file} className="space-y-2">
      <h3 className="break-all font-mono text-sm font-medium">{file}</h3>
      <FindingsTable findings={list} />
    </div>
  ));
}

function fileNote(f) {
  if (!f.analyzed) return f.skipReason || "Skipped";
  const notes = [];
  if (f.hiddenFindings > 0) {
    notes.push(`${f.hiddenFindings} issue(s) in unchanged lines are not shown`);
  }
  if (!f.aiReviewed) notes.push("Not included in the AI review (size limit)");
  return notes.join(". ");
}

export default function Review() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setAnalysis(null);
    setEmpty(false);
    setError("");

    if (id) {
      api
        .get(`/analyses/${id}`)
        .then((res) => setAnalysis(res.data.analysis))
        .catch((err) => setError(err.response?.data?.message || "Could not load this analysis"));
    } else {
      // Opened from the sidebar: show the most recent analysis
      api
        .get("/analyses", { params: { limit: 1 } })
        .then((res) => {
          const first = res.data.items[0];
          if (first) navigate(`/review/${first._id}`, { replace: true });
          else setEmpty(true);
        })
        .catch((err) => setError(err.response?.data?.message || "Could not load analyses"));
    }
  }, [id, navigate]);

  if (error) return <ErrorMessage message={error} />;

  if (empty) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="No analyses yet"
        text="Analyze a Pull Request or some code first, and the review will appear here."
      >
        <Link
          to="/github"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Go to GitHub PRs
        </Link>
      </EmptyState>
    );
  }

  if (!analysis) return <LoadingSpinner />;

  const isPr = analysis.source === "github_pr";
  const files = analysis.files || [];
  const tool = toolNames[analysis.language];
  const staticFindings = sortFindings(analysis.staticFindings || []);
  const aiFindings = sortFindings(analysis.aiFindings || []);

  const scoreNote = analysis.aiError
    ? "Based on static analysis only. The AI review did not run."
    : analysis.staticError
    ? "Based on the AI review only. Static analysis did not fully run."
    : "Based on static analysis and the AI review.";

  const statusLabel =
    analysis.status === "completed"
      ? "Completed"
      : analysis.status === "partial"
      ? analysis.aiError
        ? "Partly completed. The AI review did not run."
        : "Partly completed. Static analysis did not fully run."
      : analysis.status === "failed"
      ? "Failed. Neither part could run."
      : "Saved. Analysis has not been run yet.";

  return (
    <div className="space-y-6">
      <div>
        {isPr ? (
          <>
            <h1 className="break-words text-2xl font-semibold">
              {analysis.github.repoFullName} #{analysis.github.prNumber}
            </h1>
            <p className="mt-1 text-sm text-slate-700">{analysis.github.prTitle}</p>
            <p className="mt-1 text-sm text-slate-500">
              {analysis.github.prAuthor} · {analysis.github.headBranch} → {analysis.github.baseBranch} ·
              commit {String(analysis.github.headSha || "").slice(0, 7)} ·{" "}
              {new Date(analysis.createdAt).toLocaleString()} ·{" "}
              <a
                href={analysis.github.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
              >
                Open on GitHub <ExternalLink size={12} />
              </a>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">{analysis.projectName}</h1>
            <p className="text-sm text-slate-500">
              {languageNames[analysis.language] || analysis.language} ·{" "}
              {new Date(analysis.createdAt).toLocaleString()}
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <Link
          to={`/test-cases/${analysis._id}`}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Generate test cases
        </Link>
        <Link
          to={`/improve/${analysis._id}`}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Suggest improvements
        </Link>
        <DownloadReportButton
          id={analysis._id}
          name={isPr ? `${analysis.github.repoFullName}-${analysis.github.prNumber}` : analysis.projectName}
        />
        <Link
          to="/history"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          View history
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Quality score</p>
          <p className="text-3xl font-semibold">{analysis.qualityScore ?? "-"}</p>
          <p className="mt-1 text-xs text-slate-500">{scoreNote}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Static analysis findings</p>
          <p className="text-3xl font-semibold">{staticFindings.length}</p>
          <p className="mt-1 text-xs text-slate-500">Found by {tool}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">AI suggestions</p>
          <p className="text-3xl font-semibold">{aiFindings.length}</p>
          <p className="mt-1 text-xs text-slate-500">Potential issues, not proven bugs</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Status</p>
          <p className="mt-1 text-sm font-medium">{statusLabel}</p>
        </div>
      </div>

      {isPr && files.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Changed files</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">File</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                  <th className="px-4 py-3 font-medium">Changes</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.path} className="border-t border-slate-100 align-top">
                    <td className="break-all px-4 py-3 font-mono text-xs">{f.path}</td>
                    <td className="px-4 py-3">
                      {f.analyzed ? (
                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          Analyzed
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          Skipped
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="text-green-600">+{f.additions}</span>{" "}
                      <span className="text-red-600">-{f.deletions}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fileNote(f)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Static analysis findings</h2>
        <p className="text-sm text-slate-500">
          These results come from {tool}, a real code checking tool. They are not AI guesses.
          {isPr && " Only issues on lines changed in this Pull Request are shown."}
        </p>

        <ErrorMessage message={analysis.staticError} />

        <SeverityCounts findings={staticFindings} />
        {staticFindings.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            {analysis.staticError
              ? "No static analysis results are available."
              : `${tool} found no issues with the rules we check. This does not prove the code has no bugs.`}
          </div>
        ) : (
          <FindingsGroups findings={staticFindings} files={files} grouped={isPr} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">AI review</h2>
        <p className="text-sm text-slate-500">
          These are potential issues suggested by AI. They are not verified bugs. Please check each
          one yourself before changing your code.
        </p>

        <ErrorMessage message={analysis.aiError} />

        {!analysis.aiError && (
          <>
            <SeverityCounts findings={aiFindings} />
            {aiFindings.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                The AI did not report any potential issues. This does not prove the code is correct.
              </div>
            ) : (
              <FindingsGroups findings={aiFindings} files={files} grouped={isPr} />
            )}
          </>
        )}
      </section>

      {!isPr && analysis.sourceCode && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Submitted code</h2>
          <CodeEditor value={analysis.sourceCode} language={analysis.language} readOnly height="360px" />
        </section>
      )}
    </div>
  );
}