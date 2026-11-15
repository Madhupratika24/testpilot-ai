// Our own simple scoring rule: start at 100 and subtract points per finding.
const PENALTY = { critical: 25, high: 15, medium: 8, low: 3, info: 1 };

export function calculateScore(findings) {
  const penalty = findings.reduce((sum, f) => sum + (PENALTY[f.severity] || 0), 0);
  return Math.max(0, 100 - penalty);
}