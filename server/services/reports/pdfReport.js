import PDFDocument from "pdfkit";

const COLORS = { text: "#1e293b", muted: "#64748b", line: "#e2e8f0", brand: "#4f46e5" };
const SEVERITY_COLORS = {
  critical: "#b91c1c",
  high: "#c2410c",
  medium: "#b45309",
  low: "#1d4ed8",
  info: "#475569",
};
const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];
const MAX_FINDINGS = 100;

// The standard PDF fonts only support basic Latin characters, so other characters become "?"
const clean = (value) =>
  String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\t/g, "  ")
    .replace(/[^\n\x20-\x7E\u00A0-\u00FF]/g, "?");

function ensureSpace(doc, needed) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) doc.addPage();
}

function heading(doc, text) {
  ensureSpace(doc, 60);
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(14).fillColor(COLORS.brand).text(text);
  const y = doc.y + 2;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .strokeColor(COLORS.line)
    .stroke();
  doc.moveDown(0.6).fillColor(COLORS.text);
}

function body(doc, text) {
  doc.font("Helvetica").fontSize(10).fillColor(COLORS.text).text(clean(text));
}

function note(doc, text) {
  doc.font("Helvetica-Oblique").fontSize(9).fillColor(COLORS.muted).text(clean(text));
  doc.fillColor(COLORS.text);
}

function detail(doc, label, value) {
  if (value === undefined || value === null || value === "") return;
  doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.text).text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(clean(value));
}

function codeBlock(doc, text, maxLines = 60) {
  const lines = clean(text).split("\n");
  doc.font("Courier").fontSize(8).fillColor(COLORS.text).text(lines.slice(0, maxLines).join("\n"), { lineGap: 1 });
  if (lines.length > maxLines) note(doc, `... ${lines.length - maxLines} more line(s) not shown`);
  doc.font("Helvetica");
}

function finding(doc, f) {
  ensureSpace(doc, 80);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(SEVERITY_COLORS[f.severity] || COLORS.text)
    .text(`[${String(f.severity || "info").toUpperCase()}] ${clean(f.title)}`);
  const where = [f.file, f.line ? `line ${f.line}` : null].filter(Boolean).join(", ");
  const meta = [where, f.ruleId || f.category].filter(Boolean).join(" | ");
  if (meta) note(doc, meta);
  doc.fillColor(COLORS.text);
  body(doc, f.description || f.message || "");
  if (f.snippet) {
    doc.moveDown(0.2);
    codeBlock(doc, f.snippet, 3);
  }
  if (f.whyItMatters) body(doc, `Why it matters: ${f.whyItMatters}`);
  if (f.recommendation) body(doc, `Suggested fix: ${f.recommendation}`);
  doc.moveDown(0.6);
}

function findingsSection(doc, list, files, grouped) {
  const sorted = [...list].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) || (a.line || 0) - (b.line || 0)
  );
  const shown = sorted.slice(0, MAX_FINDINGS);

  if (!grouped) {
    shown.forEach((f) => finding(doc, f));
  } else {
    const order = files.map((f) => f.path);
    const groups = new Map();
    shown.forEach((f) => {
      const key = f.file || "(unknown file)";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(f);
    });
    [...groups.entries()]
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .forEach(([file, items]) => {
        ensureSpace(doc, 40);
        doc.font("Courier-Bold").fontSize(10).fillColor(COLORS.text).text(clean(file));
        doc.moveDown(0.3);
        items.forEach((f) => finding(doc, f));
      });
  }
  if (sorted.length > MAX_FINDINGS) note(doc, `... and ${sorted.length - MAX_FINDINGS} more finding(s) not shown`);
}

export function buildReport(analysis) {
  const isPr = analysis.source === "github_pr";
  const files = analysis.files || [];
  const staticFindings = analysis.staticFindings || [];
  const aiFindings = analysis.aiFindings || [];
  const testCases = analysis.testCases || [];
  const improvements = analysis.improvements || [];
  const tool = { javascript: "ESLint", python: "Ruff", mixed: "ESLint and Ruff" }[analysis.language] || "a static tool";
  const languageName = { javascript: "JavaScript", python: "Python", mixed: "JavaScript and Python" }[analysis.language];

  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    bufferPages: true,
    info: { Title: `TestPilot AI report - ${clean(analysis.projectName)}`, Author: "TestPilot AI" },
  });

  // Title
  doc.font("Helvetica-Bold").fontSize(22).fillColor(COLORS.brand).text("TestPilot AI");
  doc.font("Helvetica").fontSize(12).fillColor(COLORS.muted).text("Code Review Report");
  doc.moveDown(0.8).fillColor(COLORS.text);

  // Project details
  heading(doc, "Project details");
  if (isPr) {
    detail(doc, "Type", "GitHub Pull Request analysis");
    detail(doc, "Repository", analysis.github?.repoFullName);
    detail(doc, "Pull Request", `#${analysis.github?.prNumber} ${analysis.github?.prTitle || ""}`);
    detail(doc, "Author", analysis.github?.prAuthor);
    detail(doc, "Branches", `${analysis.github?.headBranch} -> ${analysis.github?.baseBranch}`);
    detail(doc, "Commit", String(analysis.github?.headSha || "").slice(0, 10));
    detail(doc, "Link", analysis.github?.prUrl);
  } else {
    detail(doc, "Type", "Manual code analysis");
    detail(doc, "Project", analysis.projectName);
  }
  detail(doc, "Language", languageName);
  detail(doc, "Analysis date", new Date(analysis.createdAt).toLocaleString("en-GB"));
  detail(doc, "Status", analysis.status);
  detail(doc, "Quality score", analysis.qualityScore ?? "not available");
  detail(doc, "Static analysis findings", staticFindings.length);
  detail(doc, "AI suggestions", aiFindings.length);
  detail(doc, "Test case suggestions", testCases.length);
  doc.moveDown(0.5);
  note(
    doc,
    "How to read this report: static analysis findings come from a real code checking tool. AI suggestions are potential issues, not verified bugs. Test cases and improved code are suggestions that were not run or tested. The quality score is a simple custom score (100 minus points for each finding)."
  );

  // Code or files
  if (isPr) {
    heading(doc, "Changed files");
    files.forEach((f) => {
      ensureSpace(doc, 30);
      doc.font("Courier").fontSize(9).fillColor(COLORS.text).text(clean(f.path), { continued: true });
      doc
        .font("Helvetica")
        .text(`   (+${f.additions || 0} -${f.deletions || 0})  ${f.analyzed ? "Analyzed" : "Skipped: " + clean(f.skipReason || "")}`);
    });
  } else if (analysis.sourceCode) {
    heading(doc, "Submitted code");
    codeBlock(doc, analysis.sourceCode, 120);
  }

  // Static analysis
  heading(doc, `Static analysis findings (${tool})`);
  note(doc, "These results come from a real code checking tool.");
  doc.moveDown(0.3);
  if (analysis.staticError) body(doc, `Problem: ${analysis.staticError}`);
  if (staticFindings.length === 0) {
    body(doc, analysis.staticError ? "No static analysis results are available." : "No issues were found with the rules that are checked.");
  } else {
    findingsSection(doc, staticFindings, files, isPr);
  }

  // AI review
  heading(doc, "AI review (potential issues)");
  note(doc, "Suggested by AI. These are not verified bugs. Please check each one before changing code.");
  doc.moveDown(0.3);
  if (analysis.aiError) body(doc, `The AI review did not run: ${analysis.aiError}`);
  else if (aiFindings.length === 0) body(doc, "The AI did not report any potential issues.");
  else findingsSection(doc, aiFindings, files, isPr);

  // Test cases
  heading(doc, "Test case suggestions");
  note(doc, "Written by AI from reading the code. They have not been run, and expected outputs may be wrong.");
  doc.moveDown(0.3);
  if (testCases.length === 0) {
    body(doc, "No test cases were generated for this analysis.");
  } else {
    testCases.slice(0, 40).forEach((t, i) => {
      ensureSpace(doc, 70);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.text).text(`${i + 1}. ${clean(t.title)} [${t.type}]`);
      const where = [t.functionName, t.file].filter(Boolean).join(" | ");
      if (where) note(doc, where);
      if (t.description) body(doc, t.description);
      detail(doc, "Input", t.input);
      detail(doc, "Expected output", t.expectedOutput);
      doc.moveDown(0.5);
    });
  }

  // Improvements
  heading(doc, "Improvement recommendations");
  note(doc, "AI suggestions. Review and test any improved code before you use it.");
  doc.moveDown(0.3);
  if (improvements.length === 0) {
    body(doc, "No code improvement was generated for this analysis.");
  } else {
    improvements.forEach((imp) => {
      ensureSpace(doc, 80);
      if (imp.file) doc.font("Courier-Bold").fontSize(10).text(clean(imp.file));
      body(doc, imp.summary || "");
      if (imp.check?.checked) {
        note(
          doc,
          `Static check: ${imp.check.originalIssues} issue(s) in the original, ${imp.check.improvedIssues} in the improved code.` +
            (imp.check.improvedSyntaxError ? " The improved code has a syntax error." : "")
        );
      }
      doc.moveDown(0.3);
      (imp.changes || []).forEach((c) => {
        ensureSpace(doc, 40);
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(COLORS.text)
          .text(`- ${clean(c.title)} [${c.category}]${c.behaviorChange ? " (changes behavior)" : ""}`);
        body(doc, c.explanation);
      });
      doc.moveDown(0.6);
    });
  }

  // Page numbers
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // lets us write inside the bottom margin without adding a page
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(`TestPilot AI report   |   Page ${i + 1} of ${range.count}`, 50, doc.page.height - 35, {
        align: "center",
        width: doc.page.width - 100,
        lineBreak: false,
      });
    doc.page.margins.bottom = bottom;
  }

  return doc;
}