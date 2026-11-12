import { Menu } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Topbar({ onMenuClick }) {
  const { user } = useAuth();
  const initial = user?.name?.charAt(0).toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
          {initial}
        </div>
      </div>
    </header>
  );
}
