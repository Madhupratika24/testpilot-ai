import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import api from "../services/api";
import CodeEditor from "../components/CodeEditor.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import FindingsTable from "../components/FindingsTable.jsx";
import SeverityBadge from "../components/SeverityBadge.jsx";

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
        text="Analyze some code first, and the review will appear here."
      >
        <Link
          to="/analyzer"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Go to Code Analyzer
        </Link>
      </EmptyState>
    );
  }

  if (!analysis) return <LoadingSpinner />;

  const tool = toolNames[analysis.language];
  const staticFindings = sortFindings(analysis.staticFindings || []);
  const aiFindings = sortFindings(analysis.aiFindings || []);

  const scoreNote = analysis.aiError
    ? "Based on static analysis only. The AI review did not run."
    : analysis.staticError
    ? "Based on the AI review only. Static analysis did not run."
    : "Based on static analysis and the AI review.";

  const statusLabel =
    analysis.status === "completed"
      ? "Completed"
      : analysis.status === "partial"
      ? analysis.aiError
        ? "Partly completed. The AI review did not run."
        : "Partly completed. Static analysis did not run."
      : analysis.status === "failed"
      ? "Failed. Neither part could run."
      : "Saved. Analysis has not been run yet.";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{analysis.projectName}</h1>
        <p className="text-sm text-slate-500">
          {languageNames[analysis.language] || analysis.language} ·{" "}
          {new Date(analysis.createdAt).toLocaleString()}
        </p>
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Static analysis findings</h2>
        <p className="text-sm text-slate-500">
          These results come from {tool}, a real code checking tool. They are not AI guesses.
        </p>

        <ErrorMessage message={analysis.staticError} />

        {!analysis.staticError && (
          <>
            <SeverityCounts findings={staticFindings} />
            {staticFindings.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                {tool} found no issues with the rules we check. This does not prove the code has no
                bugs.
              </div>
            ) : (
              <FindingsTable findings={staticFindings} />
            )}
          </>
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
              <FindingsTable findings={aiFindings} />
            )}
          </>
        )}
      </section>

      {analysis.sourceCode && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Submitted code</h2>
          <CodeEditor value={analysis.sourceCode} language={analysis.language} readOnly height="360px" />
        </section>
      )}
    </div>
  );
}