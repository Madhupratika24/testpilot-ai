import test from "node:test";
import assert from "node:assert/strict";
import { parsePatch, annotatePatch } from "../services/github/diff.js";

const lines = (...parts) => parts.join("\n");

test("parsePatch finds added lines and counts context lines", () => {
  const patch = lines(
    "@@ -1,3 +1,5 @@",
    " function a() {",
    "+  const x = 1;",
    "+  const y = 2;",
    "   return 1;",
    " }"
  );
  assert.deepEqual([...parsePatch(patch)], [2, 3]);
});

test("parsePatch skips removed lines and uses the new line numbers", () => {
  const patch = lines("@@ -10,4 +12,4 @@", " keep", "-old", "+new", " end");
  assert.deepEqual([...parsePatch(patch)], [13]);
});

test("parsePatch handles several hunks", () => {
  const patch = lines(
    "@@ -1,2 +1,3 @@",
    " a",
    "+b",
    " c",
    "@@ -20,2 +21,3 @@",
    " x",
    "+y",
    " z"
  );
  assert.deepEqual([...parsePatch(patch)], [2, 22]);
});

test("parsePatch ignores the 'No newline at end of file' marker", () => {
  const patch = lines("@@ -1 +1,2 @@", " a", "+b", "\\ No newline at end of file");
  assert.deepEqual([...parsePatch(patch)], [2]);
});

test("annotatePatch shows real line numbers for the AI", () => {
  const patch = lines("@@ -1,3 +1,5 @@", " function a() {", "+  const x = 1;", " }");
  const out = annotatePatch(patch);
  assert.ok(out.includes("    1| function a() {"));
  assert.ok(out.includes("    2|+  const x = 1;"));
});