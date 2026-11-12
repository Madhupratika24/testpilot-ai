import { Menu } from "lucide-react";

export default function Topbar({ onMenuClick }) {
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
          <p className="text-sm font-medium">Guest</p>
          <p className="text-xs text-slate-500">Login comes in Phase 3</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
          G
        </div>
      </div>
    </header>
  );
}