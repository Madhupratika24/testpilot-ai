import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import api from "../services/api";
import DownloadReportButton from "../components/DownloadReportButton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

const languageNames = { javascript: "JavaScript", python: "Python", mixed: "Mixed" };

export default function Reports() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get("/analyses", { params: { page, limit: 10 } })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load your reports"))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-slate-500">
          Download a PDF report for any analysis. It includes the project details, the findings from the
          static tool and the AI, the test case suggestions and the improvement recommendations.
        </p>
      </div>

      <ErrorMessage message={error} />
      {loading && !data && <LoadingSpinner />}

      {data && data.total === 0 && (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          text="Analyze a Pull Request or some code, and you can download its report here."
        >
          <Link to="/github" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Go to GitHub PRs
          </Link>
        </EmptyState>
      )}

      {data && data.total > 0 && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Language</th>
                  <th className="px-4 py-3 font-medium">Issue summary</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => {
                  const isPr = a.source === "github_pr";
                  const name = isPr ? `${a.github?.repoFullName} #${a.github?.prNumber}` : a.projectName;
                  return (
                    <tr key={a._id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3">
                        <p className="break-words font-medium">{name}</p>
                        <p className="text-xs text-slate-500">{isPr ? "Pull Request" : "Manual code"}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{new Date(a.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{languageNames[a.language] || a.language}</td>
                      <td className="px-4 py-3">
                        {a.findingsCount} finding(s) · score {a.qualityScore ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <DownloadReportButton id={a._id} name={name} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <span>
              {data.total} report(s) · Page {data.page} of {data.pages}
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
    </div>
  );
}