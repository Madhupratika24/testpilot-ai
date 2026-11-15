import SeverityBadge from "./SeverityBadge.jsx";

export default function FindingsTable({ findings }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Severity</th>
            <th className="px-4 py-3 font-medium">Issue</th>
            <th className="px-4 py-3 font-medium">Line</th>
            <th className="px-4 py-3 font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f, i) => (
            <tr key={i} className="border-t border-slate-100 align-top">
              <td className="px-4 py-3">
                <SeverityBadge severity={f.severity} />
              </td>
              <td className="px-4 py-3">
                <p className="font-medium">{f.title}</p>
                {f.file && <p className="break-all text-xs text-slate-500">{f.file}</p>}
                {f.ruleId && <p className="text-xs text-slate-500">{f.ruleId}</p>}
              </td>
              <td className="px-4 py-3">{f.line ?? "-"}</td>
              <td className="space-y-1 px-4 py-3">
                <p>{f.description || f.message}</p>
                {f.snippet && (
                  <code className="block overflow-x-auto rounded bg-slate-100 px-2 py-1 text-xs">
                    {f.snippet}
                  </code>
                )}
                {f.whyItMatters && (
                  <p className="text-slate-600">
                    <span className="font-medium">Why it matters:</span> {f.whyItMatters}
                  </p>
                )}
                {f.recommendation && (
                  <p className="text-slate-600">
                    <span className="font-medium">Suggested fix:</span> {f.recommendation}
                  </p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}