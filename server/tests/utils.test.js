import test from "node:test";
import assert from "node:assert/strict";
import { calculateScore } from "../utils/score.js";
import { encrypt, decrypt } from "../utils/crypto.js";

test("score is 100 when there are no findings", () => {
  assert.equal(calculateScore([]), 100);
});

test("score subtracts points by severity", () => {
  assert.equal(calculateScore([{ severity: "high" }, { severity: "low" }]), 82);
});

test("score never goes below 0", () => {
  const many = Array.from({ length: 5 }, () => ({ severity: "critical" }));
  assert.equal(calculateScore(many), 0);
});

const KEY = "a".repeat(64);

test("encrypt hides the text and decrypt restores it", () => {
  process.env.GITHUB_TOKEN_KEY = KEY;
  const secret = "gho_example_token_123";
  const stored = encrypt(secret);
  assert.notEqual(stored, secret);
  assert.ok(!stored.includes(secret));
  assert.equal(decrypt(stored), secret);
});

test("encrypting the same text twice gives different results", () => {
  process.env.GITHUB_TOKEN_KEY = KEY;
  assert.notEqual(encrypt("same"), encrypt("same"));
});

test("a tampered value is rejected", () => {
  process.env.GITHUB_TOKEN_KEY = KEY;
  const parts = encrypt("secret").split(".");
  parts[2] = Buffer.from("tampered data").toString("base64");
  assert.throws(() => decrypt(parts.join(".")));
});

test("encryption refuses to work without a valid key", () => {
  const saved = process.env.GITHUB_TOKEN_KEY;
  process.env.GITHUB_TOKEN_KEY = "too-short";
  try {
    assert.throws(() => encrypt("x"), /64 hex/);
  } finally {
    process.env.GITHUB_TOKEN_KEY = saved;
  }
});