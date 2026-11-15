import Editor from "@monaco-editor/react";
import LoadingSpinner from "./LoadingSpinner.jsx";

export default function CodeEditor({ value, onChange, language, height = "460px", readOnly = false }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-300">
      <Editor
        height={height}
        language={language}
        value={value}
        theme="vs-dark"
        onChange={(v) => onChange?.(v ?? "")}
        loading={<LoadingSpinner text="Loading editor..." />}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          readOnly,
        }}
      />
    </div>
  );
}