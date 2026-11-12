import { Link } from "react-router-dom";
import {
  Rocket,
  Bug,
  FlaskConical,
  Sparkles,
  FileText,
  History,
  Code2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Bug,
    title: "Static code analysis",
    text: "Real linting results from ESLint (JavaScript) and Ruff (Python), with line numbers.",
  },
  {
    icon: Sparkles,
    title: "AI-assisted review",
    text: "Gemini points out possible logic errors, security concerns and performance issues. These are suggestions to check, not proven bugs.",
  },
  {
    icon: FlaskConical,
    title: "Test case generation",
    text: "Get suggested test cases with inputs, expected outputs, edge cases and boundary cases.",
  },
  {
    icon: Code2,
    title: "Code improvement",
    text: "See an improved version of your code side by side with the original, with an explanation.",
  },
  {
    icon: History,
    title: "Analysis history",
    text: "Every analysis is saved to your account so you can search it and come back later.",
  },
  {
    icon: FileText,
    title: "PDF reports",
    text: "Download a clean report with findings, test cases and recommendations.",
  },
];

const steps = [
  { n: "1", title: "Create an account", text: "Register and log in securely." },
  { n: "2", title: "Add your code", text: "Paste it into the editor or upload a file." },
  { n: "3", title: "Run the analysis", text: "Static analysis and AI review run together." },
  { n: "4", title: "Use the results", text: "Generate tests, improve the code, download a report." },
];

const benefits = [
  "Understand why code has problems, not just that it does",
  "Catch edge cases you may have missed",
  "Save time writing test cases",
  "Keep a history of your code reviews",
  "Learn better coding practices as you go",
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
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-indigo-50 to-white">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <p className="mb-4 inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
            AI-powered code review and testing
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Review code, find problems and generate test cases in one place
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            TestPilot AI combines static code analysis with AI-assisted review, so you can
            understand your code, improve it and test it faster.
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
          Everything you need to review and test your code, without switching between tools.
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
          <h2 className="text-2xl font-bold text-white">Ready to review your first piece of code?</h2>
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
          <span>Built as an internship project. AI suggestions must be reviewed by the developer.</span>
        </div>
      </footer>
    </div>
  );
}