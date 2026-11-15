import { analyzeJavaScript } from "./javascriptAnalyzer.js";
import { analyzePython } from "./pythonAnalyzer.js";

const MAX_FINDINGS = 200;

export async function runStaticAnalysis(language, code) {
  let findings;
  if (language === "javascript") findings = await analyzeJavaScript(code);
  else if (language === "python") findings = await analyzePython(code);
  else throw new Error(`Static analysis is not supported for ${language}`);

  return findings.slice(0, MAX_FINDINGS);
}