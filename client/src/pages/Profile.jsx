import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext.jsx";
import PasswordInput from "../components/PasswordInput.jsx";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

function Message({ kind, text }) {
  if (!text) return null;
  const style =
    kind === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-green-200 bg-green-50 text-green-700";
  return <p className={`rounded-lg border px-3 py-2 text-sm ${style}`}>{text}</p>;
}

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [profileMsg, setProfileMsg] = useState({ kind: "", text: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordMsg, setPasswordMsg] = useState({ kind: "", text: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleProfile(e) {
    e.preventDefault();
    setProfileMsg({ kind: "", text: "" });
    if (name.trim().length < 2) {
      return setProfileMsg({ kind: "error", text: "Enter your full name" });
    }
    setSavingProfile(true);
    try {
      const res = await api.put("/auth/profile", { name: name.trim() });
      updateUser(res.data.user);
      setProfileMsg({ kind: "success", text: "Profile updated." });
    } catch (err) {
      setProfileMsg({ kind: "error", text: err.response?.data?.message || "Could not update your profile" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePassword(e) {
    e.preventDefault();
    setPasswordMsg({ kind: "", text: "" });
    if (!current) return setPasswordMsg({ kind: "error", text: "Enter your current password" });
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
      return setPasswordMsg({
        kind: "error",
        text: "New password must be at least 8 characters, with a letter and a number",
      });
    }
    if (next !== confirm) return setPasswordMsg({ kind: "error", text: "The new passwords do not match" });

    setSavingPassword(true);
    try {
      await api.put("/auth/password", { currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      setPasswordMsg({ kind: "success", text: "Password changed." });
    } catch (err) {
      setPasswordMsg({ kind: "error", text: err.response?.data?.message || "Could not change your password" });
    } finally {
      setSavingPassword(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile &amp; Settings</h1>
        <p className="text-sm text-slate-500">Manage your account.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 font-semibold">Account</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="w-28 text-slate-500">Email</dt>
            <dd className="break-all">{user?.email}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 text-slate-500">Member since</dt>
            <dd>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 font-semibold">Update profile</h2>
        <form onSubmit={handleProfile} className="space-y-3" noValidate>
          <Message {...profileMsg} />
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Full name
            </label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {savingProfile ? "Saving..." : "Save changes"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 font-semibold">Change password</h2>
        <form onSubmit={handlePassword} className="space-y-3" noValidate>
          <Message {...passwordMsg} />
          <div>
            <label htmlFor="current" className="mb-1 block text-sm font-medium">
              Current password
            </label>
            <PasswordInput id="current" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </div>
          <div>
            <label htmlFor="next" className="mb-1 block text-sm font-medium">
              New password
            </label>
            <PasswordInput id="next" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1 block text-sm font-medium">
              Confirm new password
            </label>
            <PasswordInput id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {savingPassword ? "Saving..." : "Change password"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 font-semibold">GitHub</h2>
        <p className="mb-3 text-sm text-slate-600">Connect or disconnect your GitHub account.</p>
        <Link
          to="/github"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Manage GitHub connection
        </Link>
      </section>

      <button
        onClick={handleLogout}
        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        <LogOut size={16} /> Log out
      </button>
    </div>
  );
}