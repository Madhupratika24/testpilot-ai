import { Link } from "react-router-dom";
import {
  Rocket,
  GitPullRequest,
  Bug,
  Sparkles,
  FlaskConical,
  FileText,
  Code2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: GitPullRequest,
    title: "GitHub Pull Request analysis",
    text: "Connect GitHub, pick a repository and a Pull Request, and review only the code that changed.",
  },
  {
    icon: Bug,
    title: "Real static analysis",
    text: "ESLint (JavaScript) and Ruff (Python) check the changed lines. These results are verified tool output.",
  },
  {
    icon: Sparkles,
    title: "AI-assisted review",
    text: "Gemini points out possible logic errors, security concerns and edge cases. These are suggestions, not proven bugs.",
  },
  {
    icon: FlaskConical,
    title: "Test case suggestions",
    text: "Get normal, edge, boundary and invalid-input test cases for the functions that changed.",
  },
  {
    icon: Code2,
    title: "Code improvement",
    text: "See the original and an improved version side by side, with an explanation and a lint check.",
  },
  {
    icon: FileText,
    title: "History and PDF reports",
    text: "Every analysis is saved to your account. Search it later and download a clean PDF report.",
  },
];

const steps = [
  { n: "1", title: "Connect GitHub", text: "Sign in and approve the connection with OAuth." },
  { n: "2", title: "Choose a Pull Request", text: "Pick a repository and one of its Pull Requests." },
  { n: "3", title: "Analyze the changes", text: "Static tools and AI review the changed code together." },
  { n: "4", title: "Use the results", text: "Generate tests, improve the code and download a report." },
];

const benefits = [
  "Review focuses on the lines that actually changed",
  "Verified tool findings are kept separate from AI suggestions",
  "Line numbers match the Pull Request, so issues are easy to find",
  "Your code is never executed on the server",
  "A manual analyzer is included for quick checks of pasted code",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Rocket className="text-indigo-600" />
            TestPilot AI
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900">How it works</a>
            <a href="#benefits" className="hover:text-slate-900">Benefits</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Login
            </Link>
            <Link to="/register" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-indigo-50 to-white">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <p className="mb-4 inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
            AI-assisted GitHub Pull Request review
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Review Pull Requests with static analysis and AI
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            TestPilot AI reads the code changed in a GitHub Pull Request, checks it with ESLint and
            Ruff, adds an AI review, and suggests tests and improvements.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
            >
              Get started free <ArrowRight size={18} />
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16">
        <h2 className="text-center text-3xl font-bold">Key features</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          Everything you need to review and test a Pull Request in one place.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <Icon size={20} />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-3xl font-bold">How it works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="rounded-2xl bg-white p-6 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white">
                  {s.n}
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="mx-auto max-w-4xl scroll-mt-20 px-6 py-16">
        <h2 className="text-center text-3xl font-bold">Why use TestPilot AI</h2>
        <ul className="mx-auto mt-8 max-w-xl space-y-3">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-3 text-slate-700">
              <CheckCircle2 className="mt-0.5 shrink-0 text-indigo-600" size={20} />
              {b}
            </li>
          ))}
        </ul>
      </section>

      {/* Call to action */}
      <section className="bg-slate-900">
        <div className="mx-auto max-w-4xl px-6 py-14 text-center">
          <h2 className="text-2xl font-bold text-white">Ready to review your first Pull Request?</h2>
          <Link
            to="/register"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-6 py-3 font-medium text-white hover:bg-indigo-400"
          >
            Create your account <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-slate-500 sm:flex-row">
          <span className="flex items-center gap-2">
            <Rocket size={16} className="text-indigo-600" /> TestPilot AI
          </span>
          <span>Internship project. AI suggestions must be reviewed by the developer.</span>
        </div>
      </footer>
    </div>
  );
}