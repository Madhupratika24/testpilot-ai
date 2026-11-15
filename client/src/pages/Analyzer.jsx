import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Trash2, Play } from "lucide-react";
import api from "../services/api";
import CodeEditor from "../components/CodeEditor.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

const MAX_CODE_LENGTH = 100000;
const MAX_FILE_SIZE = 200 * 1024; // 200 KB
const extensionToLanguage = { js: "javascript", mjs: "javascript", py: "python" };

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function Analyzer() {
  const navigate = useNavigate();
  const fileInput = useRef(null);

  const [projectName, setProjectName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleFile(e) {
    const file = e.target.files[0];
    e.target.value = ""; // lets you pick the same file again later
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    const detected = extensionToLanguage[ext];
    if (!detected) {
      setError("Only .js, .mjs and .py files are supported");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("File is too large (maximum 200 KB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCode(String(reader.result));
      setLanguage(detected);
      if (!projectName.trim()) setProjectName(file.name.replace(/\.[^.]+$/, ""));
      setError("");
    };
    reader.onerror = () => setError("Could not read the file");
    reader.readAsText(file);
  }

  function handleClear() {
    setCode("");
    setError("");
  }

  async function handleAnalyze() {
    setError("");
    if (!projectName.trim()) return setError("Enter a project name");
    if (!code.trim()) return setError("Paste or upload some code first");
    if (code.length > MAX_CODE_LENGTH) return setError("Code is too long (maximum 100,000 characters)");

    setLoading(true);
    try {
      const res = await api.post("/analyses", {
        projectName: projectName.trim(),
        language,
        sourceCode: code,
      });
      navigate(`/review/${res.data.analysis._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not reach the server. Is it running?");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Code Analyzer</h1>
        <p className="text-sm text-slate-500">Paste or upload JavaScript or Python code.</p>
      </div>

      <ErrorMessage message={error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="projectName" className="mb-1 block text-sm font-medium">Project name</label>
          <input
            id="projectName"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            maxLength={100}
            placeholder="e.g. Calculator"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="language" className="mb-1 block text-sm font-medium">Language</label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={inputClass}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>
        </div>
      </div>

      <CodeEditor value={code} onChange={setCode} language={language} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <input
            ref={fileInput}
            type="file"
            accept=".js,.mjs,.py"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInput.current.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <Upload size={16} /> Upload file
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <Trash2 size={16} /> Clear code
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">
            {code.length.toLocaleString()} / {MAX_CODE_LENGTH.toLocaleString()} characters
          </span>
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Play size={16} /> {loading ? "Saving..." : "Analyze Code"}
          </button>
        </div>
      </div>
    </div>
  );
}