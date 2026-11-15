import { spawn } from "node:child_process";

// Different ways Ruff may be installed on Windows
const CANDIDATES = [["ruff"], ["python", "-m", "ruff"], ["py", "-m", "ruff"]];

const RUFF_ARGS = [
  "check",
  "--isolated", // ignore any config files
  "--no-cache",
  "--output-format",
  "json",
  "--select",
  "F,E7,E9,B",
  "--stdin-filename",
  "snippet.py",
  "-", // read the code from standard input
];

const TITLES = {
  F401: "Unused import",
  F841: "Unused variable",
  F821: "Undefined name",
  F811: "Name defined twice",
  E711: "Comparison with None",
  E712: "Comparison with True/False",
  E722: "Bare except",
  B006: "Mutable default argument",
};

const RECOMMENDATIONS = {
  F401: "Remove the unused import.",
  F841: "Remove the variable, or use it.",
  F821: "Define the name before using it, or check the spelling.",
  F811: "Remove or rename the duplicate definition.",
  E711: "Use 'is None' or 'is not None' to compare with None.",
  E712: "Use the value directly, for example 'if value:'.",
  E722: "Catch specific exceptions instead of a bare 'except:'.",
  B006: "Use None as the default, and create the list or dict inside the function.",
};

function severityFor(ruleCode) {
  if (!ruleCode || ruleCode.startsWith("E9")) return "critical";
  if (["F821", "F822", "F823"].includes(ruleCode)) return "high";
  if (ruleCode.startsWith("B") || ruleCode.startsWith("E7")) return "medium";
  return "low";
}

// Runs a program and gives it the code as input. The code is NOT executed:
// Ruff only reads it as text.
function run(command, args, input, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Ruff took too long to check this code"));
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}

export async function analyzePython(source) {
  let output = null;

  for (const [command, ...prefix] of CANDIDATES) {
    try {
      const result = await run(command, [...prefix, ...RUFF_ARGS], source);
      if (/No module named ruff/i.test(result.stderr)) continue;
      output = result;
      break;
    } catch (err) {
      if (err.code === "ENOENT") continue; // program not found, try the next one
      throw err;
    }
  }

  if (!output) {
    throw new Error("Python analysis is unavailable: Ruff is not installed on the server.");
  }
  // Ruff exits with 0 (no issues) or 1 (issues found). Anything else is an error.
  if (output.code !== 0 && output.code !== 1) {
    throw new Error(`Ruff could not check this code. ${output.stderr.trim().slice(0, 200)}`);
  }

  let items;
  try {
    items = JSON.parse(output.stdout || "[]");
  } catch {
    throw new Error("Ruff returned a result that could not be read.");
  }

  const lines = source.split(/\r?\n/);
  return items.map((item) => {
    const ruleCode = item.code;
    const row = item.location?.row;
    return {
      ruleId: ruleCode || "syntax-error",
      title: TITLES[ruleCode] || (ruleCode ? item.message.slice(0, 80) : "Syntax error"),
      severity: severityFor(ruleCode),
      message: item.message,
      line: row,
      column: item.location?.column,
      snippet: (lines[row - 1] || "").trim().slice(0, 200),
      recommendation: ruleCode
        ? RECOMMENDATIONS[ruleCode] || ""
        : "Fix the syntax error so the code can run.",
    };
  });
}