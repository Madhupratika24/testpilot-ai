import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DiffEditor } from "@monaco-editor/react";
import { Check, Copy, Sparkles } from "lucide-react";
import api from "../services/api";
import CodeEditor from "../components/CodeEditor.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

const toolNames = { javascript: "ESLint", python: "Ruff" };
const categoryLabels = {
  "bug-fix": "Bug fix",
  readability: "Readability",
  performance: "Performance",
  "best-practice": "Best practice",
  validation: "Validation",
  security: "Security",
};
const categoryStyles = {
  "bug-fix": "bg-red-100 text-red-700",
  readability: "bg-blue-100 text-blue-700",
  performance: "bg-purple-100 text-purple-700",
  "best-practice": "bg-slate-100 text-slate-700",
  validation: "bg-amber-100 text-amber-700",
  security: "bg-orange-100 text-orange-700",
};

export default function Improve() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState("");
  const [selectedPath, setSelectedPath] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [tab, setTab] = useState("compare");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setAnalysis(null);
    setEmpty(false);
    setError("");
    setGenerateError("");
    setTab("compare");

    if (id) {
      api
        .get(`/analyses/${id}`)
        .then((res) => {
          const a = res.data.analysis;
          setAnalysis(a);
          const first = (a.files || []).find((f) => f.analyzed && f.content);
          setSelectedPath(first ? first.path : "");
        })
        .catch((err) => setError(err.response?.data?.message || "Could not load this analysis"));
    } else {
      // Opened from the sidebar: use the most recent analysis
      api
        .get("/analyses", { params: { limit: 1 } })
        .then((res) => {
          const first = res.data.items[0];
          if (first) navigate(`/improve/${first._id}`, { replace: true });
          else setEmpty(true);
        })
        .catch((err) => setError(err.response?.data?.message || "Could not load analyses"));
    }
  }, [id, navigate]);

  async function handleGenerate() {
    setGenerateError("");
    setGenerating(true);
    try {
      const res = await api.post(
        `/analyses/${id}/improve`,
        { path: selectedPath },
        { timeout: 240000 }
      );
      const record = res.data.improvement;
      setAnalysis((a) => ({
        ...a,
        improvements: [...(a.improvements || []).filter((i) => (i.file || "") !== (record.file || "")), record],
      }));
      setTab("compare");
    } catch (err) {
      setGenerateError(
        err.response?.data?.message || "Could not create the improvement. Is the server running?"
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this code:", text);
    }
  }

  if (error) return <ErrorMessage message={error} />;

  if (empty) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No analyses yet"
        text="Analyze a Pull Request or some code first, then ask for improvements."
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
  const analyzedFiles = (analysis.files || []).filter((f) => f.analyzed && f.content);
  const currentFile = isPr ? analyzedFiles.find((f) => f.path === selectedPath) : null;

  const language = isPr ? currentFile?.language : analysis.language;
  const original = isPr ? currentFile?.content || "" : analysis.sourceCode || "";
  const improvement = (analysis.improvements || []).find(
    (i) => (i.file || "") === (isPr ? selectedPath : "")
  );
  const unchanged = improvement && improvement.improvedCode.trim() === original.trim();

  const title = isPr ? `${analysis.github.repoFullName} #${analysis.github.prNumber}` : analysis.projectName;
  const tool = toolNames[language] || "the static tool";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Code Improvement</h1>
        <p className="mt-1 text-sm text-slate-500">
          For <span className="font-medium text-slate-700">{title}</span> ·{" "}
          <Link to={`/review/${analysis._id}`} className="text-indigo-600 hover:underline">
            Back to the review
          </Link>
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        The improved code is an AI <strong>suggestion</strong>. It has <strong>not been run or tested</strong>.
        Please read every change, and test the code yourself before you use it.
      </div>

      {isPr && analyzedFiles.length === 0 && (
        <ErrorMessage message="This Pull Request has no analyzed files to improve." />
      )}

      {isPr && analyzedFiles.length > 0 && (
        <div>
          <label htmlFor="file" className="mb-1 block text-sm font-medium">
            File
          </label>
          <select
            id="file"
            value={selectedPath}
            onChange={(e) => {
              setSelectedPath(e.target.value);
              setGenerateError("");
              setTab("compare");
            }}
            className="w-full max-w-lg rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            {analyzedFiles.map((f) => (
              <option key={f.path} value={f.path}>
                {f.path}
              </option>
            ))}
          </select>
        </div>
      )}

      <ErrorMessage message={generateError} />

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={generating || (isPr && !currentFile)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          <Sparkles size={16} />
          {generating ? "Working..." : improvement ? "Suggest again" : "Suggest improvements"}
        </button>
        {generating && (
          <span className="text-sm text-slate-500">This can take up to a minute or two. Please keep this page open.</span>
        )}
      </div>

      {!improvement && !generating && (
        <EmptyState
          icon={Sparkles}
          title="No improvement yet"
          text="Click Suggest improvements to get an improved version of this code, with an explanation."
        />
      )}

      {improvement && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-2 font-semibold">Summary</h2>
            <p className="text-sm text-slate-700">
              {improvement.summary || "The AI did not give a summary."}
            </p>
            {unchanged && (
              <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                The AI did not change the code. It may have found nothing worth changing.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="mb-2 font-semibold">Check with {tool}</h2>
            {improvement.check?.checked ? (
              <div className="space-y-2">
                <p className="text-slate-700">
                  Issues found in this file: <strong>{improvement.check.originalIssues}</strong> in the
                  original, <strong>{improvement.check.improvedIssues}</strong> in the improved code.
                </p>
                {improvement.check.improvedSyntaxError ? (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
                    The improved code has a syntax error. Do not use it as it is.
                  </p>
                ) : (
                  <p className="rounded-lg bg-green-50 px-3 py-2 text-green-700">
                    The improved code has no syntax errors. This does not prove that it works in the same
                    way as the original.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-slate-600">The improved code could not be checked with {tool}.</p>
            )}
          </section>

          {improvement.changes?.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">What changed and why</h2>
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                {improvement.changes.map((c, i) => (
                  <li key={i} className="space-y-1 p-4">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          categoryStyles[c.category] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {categoryLabels[c.category] || c.category}
                      </span>
                      {c.title}
                      {c.behaviorChange && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          Changes behavior
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-600">{c.explanation}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {[
                  ["compare", "Compare"],
                  ["improved", "Improved code"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium ${
                      tab === key
                        ? "bg-slate-800 text-white"
                        : "border border-slate-300 bg-white hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleCopy(improvement.improvedCode)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy improved code"}
              </button>
            </div>

            {tab === "compare" ? (
              <>
                <div className="flex justify-between px-1 text-xs text-slate-500">
                  <span>Original</span>
                  <span>Improved (AI suggestion)</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-300">
                  <DiffEditor
                    height="520px"
                    language={language}
                    original={original}
                    modified={improvement.improvedCode}
                    theme="vs-dark"
                    loading={<LoadingSpinner text="Loading editor..." />}
                    options={{
                      readOnly: true,
                      renderSideBySide: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>
              </>
            ) : (
              <CodeEditor value={improvement.improvedCode} language={language} readOnly height="520px" />
            )}
          </section>
        </>
      )}
    </div>
  );
}