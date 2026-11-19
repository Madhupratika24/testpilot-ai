import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, Copy, FlaskConical } from "lucide-react";
import api from "../services/api";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

const typeStyles = {
  normal: "bg-green-100 text-green-700",
  edge: "bg-amber-100 text-amber-700",
  boundary: "bg-blue-100 text-blue-700",
  invalid: "bg-red-100 text-red-700",
};
const typeLabels = {
  normal: "Normal",
  edge: "Edge case",
  boundary: "Boundary",
  invalid: "Invalid input",
};
const typeOrder = ["normal", "edge", "boundary", "invalid"];

function formatCase(tc) {
  const lines = [`Test: ${tc.title}`, `Type: ${typeLabels[tc.type] || tc.type}`];
  if (tc.file) lines.push(`File: ${tc.file}`);
  if (tc.functionName) lines.push(`Function: ${tc.functionName}`);
  lines.push(`Input: ${tc.input}`, `Expected output: ${tc.expectedOutput}`);
  if (tc.description) lines.push(`Note: ${tc.description}`);
  return lines.join("\n");
}

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this text:", text);
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied" : label}
    </button>
  );
}

export default function TestCases() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [triedOnce, setTriedOnce] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setAnalysis(null);
    setEmpty(false);
    setError("");
    setGenerateError("");
    setTriedOnce(false);
    setFilter("all");

    if (id) {
      api
        .get(`/analyses/${id}`)
        .then((res) => setAnalysis(res.data.analysis))
        .catch((err) => setError(err.response?.data?.message || "Could not load this analysis"));
    } else {
      // Opened from the sidebar: use the most recent analysis
      api
        .get("/analyses", { params: { limit: 1 } })
        .then((res) => {
          const first = res.data.items[0];
          if (first) navigate(`/test-cases/${first._id}`, { replace: true });
          else setEmpty(true);
        })
        .catch((err) => setError(err.response?.data?.message || "Could not load analyses"));
    }
  }, [id, navigate]);

  async function handleGenerate() {
    setGenerateError("");
    setGenerating(true);
    try {
      const res = await api.post(`/analyses/${id}/test-cases`, {}, { timeout: 240000 });
      setAnalysis((a) => ({ ...a, testCases: res.data.testCases }));
      setTriedOnce(true);
      setFilter("all");
    } catch (err) {
      setGenerateError(
        err.response?.data?.message || "Could not generate test cases. Is the server running?"
      );
    } finally {
      setGenerating(false);
    }
  }

  if (error) return <ErrorMessage message={error} />;

  if (empty) {
    return (
      <EmptyState
        icon={FlaskConical}
        title="No analyses yet"
        text="Analyze a Pull Request or some code first, then generate test cases for it."
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

  const testCases = analysis.testCases || [];
  const shown = filter === "all" ? testCases : testCases.filter((t) => t.type === filter);
  const counts = typeOrder.map((t) => ({ type: t, count: testCases.filter((c) => c.type === t).length }));
  const isPr = analysis.source === "github_pr";

  const title = isPr
    ? `${analysis.github.repoFullName} #${analysis.github.prNumber}`
    : analysis.projectName;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Test Cases</h1>
        <p className="mt-1 text-sm text-slate-500">
          For <span className="font-medium text-slate-700">{title}</span> ·{" "}
          <Link to={`/review/${analysis._id}`} className="text-indigo-600 hover:underline">
            Back to the review
          </Link>
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        These are test case <strong>suggestions</strong> written by AI from reading the code. They have{" "}
        <strong>not been run</strong>, and the expected outputs may be wrong. Please check each one
        yourself.
        {isPr && " For a Pull Request, they cover the functions that contain changed lines."}
      </div>

      <ErrorMessage message={generateError} />

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          <FlaskConical size={16} />
          {generating
            ? "Generating..."
            : testCases.length > 0
            ? "Generate again"
            : "Generate test cases"}
        </button>
        {generating && (
          <span className="text-sm text-slate-500">This can take up to a minute. Please keep this page open.</span>
        )}
        {!generating && testCases.length > 0 && (
          <span className="text-sm text-slate-500">Generating again replaces the current list.</span>
        )}
      </div>

      {testCases.length === 0 && !generating && (
        <EmptyState
          icon={FlaskConical}
          title={triedOnce ? "No test cases were suggested" : "No test cases yet"}
          text={
            triedOnce
              ? "The AI did not suggest any test cases for this code. You can try again."
              : "Click Generate test cases to get suggestions for this code."
          }
        />
      )}

      {testCases.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  filter === "all" ? "bg-slate-800 text-white" : "border border-slate-300 bg-white"
                }`}
              >
                All ({testCases.length})
              </button>
              {counts
                .filter((c) => c.count > 0)
                .map((c) => (
                  <button
                    key={c.type}
                    onClick={() => setFilter(c.type)}
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      filter === c.type ? "bg-slate-800 text-white" : "border border-slate-300 bg-white"
                    }`}
                  >
                    {typeLabels[c.type]} ({c.count})
                  </button>
                ))}
            </div>
            <CopyButton
              text={shown.map(formatCase).join("\n\n")}
              label={filter === "all" ? "Copy all" : "Copy shown"}
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Test case</th>
                  <th className="px-4 py-3 font-medium">Input</th>
                  <th className="px-4 py-3 font-medium">Expected output</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((tc, i) => (
                  <tr key={i} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          typeStyles[tc.type] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {typeLabels[tc.type] || tc.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{tc.title}</p>
                      {(tc.functionName || tc.file) && (
                        <p className="break-all text-xs text-slate-500">
                          {tc.functionName}
                          {tc.functionName && tc.file ? " · " : ""}
                          {tc.file}
                        </p>
                      )}
                      {tc.description && <p className="mt-1 text-slate-600">{tc.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <code className="block whitespace-pre-wrap break-words rounded bg-slate-100 px-2 py-1 text-xs">
                        {tc.input}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <code className="block whitespace-pre-wrap break-words rounded bg-slate-100 px-2 py-1 text-xs">
                        {tc.expectedOutput}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <CopyButton text={formatCase(tc)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}