import { ESLint } from "eslint";
import js from "@eslint/js";
import globals from "globals";

// Extra rules on top of ESLint's recommended set
const extraRules = {
  eqeqeq: "warn",
  "no-var": "warn",
  "prefer-const": "warn",
  "no-eval": "error",
  "no-implied-eval": "error",
};

// Friendly names, severities and tips for common rules
const RULES = {
  "no-unused-vars": {
    title: "Unused variable",
    severity: "low",
    recommendation: "Remove the variable, or use it.",
  },
  "no-undef": {
    title: "Undefined variable",
    severity: "high",
    recommendation: "Declare the variable before using it, or check the spelling.",
  },
  eqeqeq: {
    title: "Loose equality (==)",
    severity: "low",
    recommendation: "Use === or !== to avoid unexpected type conversion.",
  },
  "no-var": {
    title: "Use of var",
    severity: "low",
    recommendation: "Use let or const instead of var.",
  },
  "prefer-const": {
    title: "Variable is never reassigned",
    severity: "low",
    recommendation: "Use const for values that are not reassigned.",
  },
  "no-eval": {
    title: "Use of eval",
    severity: "high",
    recommendation: "Avoid eval. It can run unsafe code.",
  },
  "no-implied-eval": {
    title: "Implied eval",
    severity: "high",
    recommendation: "Pass a function instead of a string to setTimeout or setInterval.",
  },
  "no-unreachable": {
    title: "Unreachable code",
    severity: "medium",
    recommendation: "Remove code that comes after return, throw, break or continue.",
  },
  "no-redeclare": {
    title: "Variable declared twice",
    severity: "medium",
    recommendation: "Remove the duplicate declaration.",
  },
  "no-dupe-keys": {
    title: "Duplicate object key",
    severity: "medium",
    recommendation: "Remove or rename the duplicate key.",
  },
  "no-cond-assign": {
    title: "Assignment inside a condition",
    severity: "medium",
    recommendation: "Use === to compare values.",
  },
  "no-empty": {
    title: "Empty block",
    severity: "low",
    recommendation: "Add code, or a comment explaining why the block is empty.",
  },
  "use-isnan": {
    title: "Comparison with NaN",
    severity: "medium",
    recommendation: "Use Number.isNaN(value) to check for NaN.",
  },
};

function createLinter(sourceType) {
  return new ESLint({
    overrideConfigFile: true, // do not read any config files from disk
    overrideConfig: [
      {
        files: ["**/*.js"],
        // Ignore /* eslint ... */ comments inside the submitted code
        linterOptions: { noInlineConfig: true },
        languageOptions: {
          ecmaVersion: "latest",
          sourceType,
          globals: { ...globals.browser, ...globals.node },
        },
        rules: { ...js.configs.recommended.rules, ...extraRules },
      },
    ],
  });
}

async function lintWith(sourceType, code) {
  const eslint = createLinter(sourceType);
  const results = await eslint.lintText(code, { filePath: "snippet.js" });
  return results[0]?.messages || [];
}

function toFinding(message, lines) {
  const info = RULES[message.ruleId];
  const isSyntaxError = Boolean(message.fatal);

  return {
    ruleId: message.ruleId || "syntax-error",
    title: isSyntaxError ? "Syntax error" : info?.title || message.ruleId,
    severity: isSyntaxError ? "critical" : info?.severity || (message.severity === 2 ? "medium" : "low"),
    message: message.message,
    line: message.line,
    column: message.column,
    snippet: (lines[message.line - 1] || "").trim().slice(0, 200),
    recommendation: isSyntaxError
      ? "Fix the syntax error so the code can run."
      : info?.recommendation || "",
  };
}

export async function analyzeJavaScript(code) {
  // Try as a module first (supports import/export). If that fails to parse,
  // try as a normal script before reporting a syntax error.
  let messages = await lintWith("module", code);
  if (messages.some((m) => m.fatal)) {
    const scriptMessages = await lintWith("script", code);
    if (!scriptMessages.some((m) => m.fatal)) {
      messages = scriptMessages;
    }
  }

  const lines = code.split(/\r?\n/);
  return messages.map((m) => toFinding(m, lines));
}