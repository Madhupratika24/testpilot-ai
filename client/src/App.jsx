import { useEffect, useState } from "react";
import { Rocket, CheckCircle2, XCircle } from "lucide-react";
import api from "./services/api";

export default function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/health")
      .then((res) => setHealth(res.data))
      .catch(() => setError("Cannot reach the backend. Is the server running?"));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-6">
          <Rocket className="text-indigo-600" />
          <h1 className="text-xl font-semibold">TestPilot AI</h1>
        </div>

        {error && (
          <p className="flex items-center gap-2 text-red-600">
            <XCircle size={18} /> {error}
          </p>
        )}

        {health && (
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-green-600">
              <CheckCircle2 size={18} /> API status: {health.status}
            </li>
            <li
              className={`flex items-center gap-2 ${
                health.database === "connected" ? "text-green-600" : "text-red-600"
              }`}
            >
              {health.database === "connected" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              Database: {health.database}
            </li>
          </ul>
        )}

        {!health && !error && <p className="text-slate-500">Checking connection...</p>}
      </div>
    </div>
  );
}