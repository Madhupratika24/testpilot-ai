import test from "node:test";
import assert from "node:assert/strict";
import { parseAiFindings } from "../services/ai/validateAiResponse.js";
import { AiError } from "../services/ai/AiError.js";
import { classifyFile, isValidName } from "../services/github/pullRequest.js";

const code = "a\nb\nc";

const reply = JSON.stringify({
  findings: [
    {
      title: "T1",
      category: "logic",
      severity: "critical",
      line: 2,
      description: "d",
      whyItMatters: "w",
      recommendation: "r",
    },
    { title: "T2", category: "weird", severity: "zzz", line: 99, description: "d2" },
    { title: "", description: "no title" },
  ],
});

test("AI findings: bad fields are fixed and incomplete items are dropped", () => {
  const result = parseAiFindings(reply, { code });
  assert.equal(result.length, 2);

  // the AI may never say "critical"
  assert.equal(result[0].severity, "high");
  // the snippet comes from the real code, not from the AI
  assert.equal(result[0].line, 2);
  assert.equal(result[0].snippet, "b");

  // a line number that does not exist is removed
  assert.equal(result[1].line, undefined);
  assert.equal(result[1].category, "best-practice");
  assert.equal(result[1].severity, "info");
});

test("AI findings: JSON inside code fences is accepted", () => {
  const result = parseAiFindings("```json\n" + reply + "\n```", { code });
  assert.equal(result.length, 2);
});

test("AI findings: extra text around the JSON is accepted", () => {
  const result = parseAiFindings("Here you go: " + reply + " Thanks!", { code });
  assert.equal(result.length, 2);
});

test("AI findings: the file name is added for Pull Requests", () => {
  const result = parseAiFindings(reply, { code, fileName: "src/app.js" });
  assert.equal(result[0].file, "src/app.js");
});

test("AI findings: text that is not JSON is rejected", () => {
  assert.throws(() => parseAiFindings("this is not json", { code }), AiError);
});

test("classifyFile skips deleted files", () => {
  const r = classifyFile({ filename: "a.js", status: "removed" });
  assert.equal(r.supported, false);
  assert.match(r.skipReason, /deleted/i);
});

test("classifyFile skips unsupported file types", () => {
  const r = classifyFile({ filename: "notes.txt", status: "added", patch: "@@ -0,0 +1 @@\n+hi" });
  assert.equal(r.supported, false);
  assert.match(r.skipReason, /not supported/i);
});

test("classifyFile accepts JavaScript and Python files with a diff", () => {
  const js = classifyFile({ filename: "src/app.js", status: "modified", patch: "@@ -1 +1 @@\n+x" });
  assert.equal(js.supported, true);
  assert.equal(js.language, "javascript");

  const py = classifyFile({ filename: "utils.py", status: "added", patch: "@@ -0,0 +1 @@\n+x" });
  assert.equal(py.supported, true);
  assert.equal(py.language, "python");
});

test("classifyFile skips generated and third-party files", () => {
  const a = classifyFile({ filename: "node_modules/x/index.js", status: "added", patch: "@@ -0,0 +1 @@\n+x" });
  const b = classifyFile({ filename: "app.min.js", status: "modified", patch: "@@ -1 +1 @@\n+x" });
  assert.equal(a.supported, false);
  assert.equal(b.supported, false);
});

test("classifyFile skips files without a diff", () => {
  const r = classifyFile({ filename: "big.js", status: "modified" });
  assert.equal(r.supported, false);
});

test("isValidName accepts normal names and rejects path tricks", () => {
  assert.equal(isValidName("my-repo.v2"), true);
  assert.equal(isValidName("../etc"), false);
  assert.equal(isValidName("a/b"), false);
  assert.equal(isValidName(".."), false);
  assert.equal(isValidName(""), false);
});