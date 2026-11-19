import { AiError } from "./AiError.js";

const SEVERITIES = ["critical", "high", "medium", "low", "info"];
const CATEGORIES = [
  "logic",
  "security",
  "performance",
  "readability",
  "validation",
  "best-practice",
  "runtime",
  "edge-case",
];

const clip = (value, max) => String(value ?? "").trim().slice(0, max);

const FORMAT_MESSAGE = "The AI returned a response in an unexpected format. Please try again.";

// Tries to read JSON, even if the AI added extra text around it
function readJson(text) {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("no JSON found");
  }
}

// Turns the AI's text into safe, checked findings
export function parseAiFindings(text, { code, fileName }) {
  let data;
  try {
    data = readJson(text);
  } catch {
    console.error("AI response could not be parsed. Start of reply:", String(text).slice(0, 800));
    throw new AiError(FORMAT_MESSAGE);
  }

  const list = Array.isArray(data) ? data : data?.findings;
  if (!Array.isArray(list)) {
    console.error("AI response had no findings list. Start of reply:", String(text).slice(0, 800));
    throw new AiError(FORMAT_MESSAGE);
  }

  const lines = code.split(/\r?\n/);
  const findings = [];

  for (const item of list.slice(0, 25)) {
    if (!item || typeof item !== "object") continue;

    const title = clip(item.title, 120);
    const description = clip(item.description, 800);
    if (!title || !description) continue; // skip incomplete findings

    // Only keep a line number that really exists in the code
    let line = Number.isInteger(item.line) ? item.line : null;
    if (line !== null && (line < 1 || line > lines.length)) line = null;

    // The AI cannot prove anything, so it is never allowed to say "critical"
    let severity = SEVERITIES.includes(item.severity) ? item.severity : "info";
    if (severity === "critical") severity = "high";

    const finding = {
      title,
      category: CATEGORIES.includes(item.category) ? item.category : "best-practice",
      severity,
      description,
      // The snippet comes from the real code, not from the AI
      snippet: line ? lines[line - 1].trim().slice(0, 200) : "",
      whyItMatters: clip(item.whyItMatters, 600),
      recommendation: clip(item.recommendation, 800),
    };
    if (line) finding.line = line;
    if (fileName) finding.file = fileName;

    findings.push(finding);
  }

  return findings;
}