import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { ClipboardList, Bug, FlaskConical, Plus, Code2 } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext.jsx";
import StatCard from "../components/StatCard.jsx";
import ChartCard from "../components/ChartCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const languageNames = { javascript: "JavaScript", python: "Python" };
const languageColors = { javascript: "#6366f1", python: "#a855f7" };

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/dashboard/stats")
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load dashboard data"));
  }, []);

  const firstName = user?.name?.split(" ")[0] || "there";

  if (error) return <ErrorMessage message={error} />;
  if (!stats) return <LoadingSpinner text="Loading your dashboard..." />;

  const hasData = stats.totals.analyses > 0;

  const activityData = {
    labels: stats.activity.map((a) =>
      new Date(a.date + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" })
    ),
    datasets: [
      {
        label: "Analyses",
        data: stats.activity.map((a) => a.count),
        backgroundColor: "#6366f1",
        borderRadius: 6,
      },
    ],
  };

  const languageData = {
    labels: stats.languages.map((l) => languageNames[l.language] || l.language),
    datasets: [
      {
        data: stats.languages.map((l) => l.count),
        backgroundColor: stats.languages.map((l) => languageColors[l.language] || "#94a3b8"),
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back, {firstName}</h1>
          <p className="text-sm text-slate-500">Here is your code analysis activity.</p>
        </div>
        <Link
          to="/analyzer"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={18} /> Analyze new code
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={ClipboardList} label="Total analyses" value={stats.totals.analyses} />
        <StatCard icon={Bug} label="Potential issues found" value={stats.totals.issues} />
        <StatCard icon={FlaskConical} label="Test cases generated" value={stats.totals.testCases} />
      </div>

      {!hasData ? (
        <EmptyState
          icon={Code2}
          title="No analyses yet"
          text="Run your first code analysis to see your activity, charts and recent projects here."
        >
        <div className="flex flex-wrap gap-2">
          <Link
            to="/github"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus size={18} /> Analyze a Pull Request
          </Link>
          <Link
            to="/analyzer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Analyze code
          </Link>
        </div>
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartCard title="Analyses in the last 7 days">
                <Bar
                  data={activityData}
                  options={{
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                  }}
                />
              </ChartCard>
            </div>
            <ChartCard title="Language distribution">
              <Doughnut data={languageData} options={{ plugins: { legend: { position: "bottom" } } }} />
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
              <h2 className="mb-4 font-semibold">Recent analyses</h2>
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-2 font-medium">Project</th>
                    <th className="pb-2 font-medium">Language</th>
                    <th className="pb-2 font-medium">Findings</th>
                    <th className="pb-2 font-medium">Score</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((a) => (
                    <tr key={a._id} className="border-t border-slate-100">
                      <td className="py-2 font-medium">{a.projectName}</td>
                      <td className="py-2">{languageNames[a.language] || a.language}</td>
                      <td className="py-2">{a.findingsCount}</td>
                      <td className="py-2">{a.qualityScore ?? "-"}</td>
                      <td className="py-2">{formatDate(a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 font-semibold">Recent projects</h2>
              <ul className="space-y-3 text-sm">
                {stats.recentProjects.map((p) => (
                  <li key={p._id} className="flex items-center justify-between">
                    <span className="font-medium">{p.projectName}</span>
                    <span className="text-slate-500">{languageNames[p.language] || p.language}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}