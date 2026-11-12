import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Code2,
  ClipboardCheck,
  FlaskConical,
  Sparkles,
  History,
  FileText,
  User,
  LogOut,
  Rocket,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const mainLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyzer", label: "Code Analyzer", icon: Code2 },
  { to: "/review", label: "Code Review", icon: ClipboardCheck },
  { to: "/test-cases", label: "Test Cases", icon: FlaskConical },
  { to: "/improve", label: "Code Improvement", icon: Sparkles },
  { to: "/history", label: "Analysis History", icon: History },
  { to: "/reports", label: "Reports", icon: FileText },
];

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-indigo-600 text-white"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 p-4 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center gap-2 px-2 pt-2 text-white">
          <Rocket className="text-indigo-400" />
          <span className="text-lg font-semibold tracking-wide">TESTPILOT AI</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {mainLinks.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkClass} onClick={onClose}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-1 border-t border-slate-700 pt-4">
          <NavLink to="/profile" className={linkClass} onClick={onClose}>
            <User size={18} />
            Profile &amp; Settings
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}