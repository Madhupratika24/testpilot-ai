import crypto from "node:crypto";

// AES-256-GCM: a standard way to encrypt text so that tampering is detected too.
function getKey() {
  const hex = process.env.GITHUB_TOKEN_KEY || "";
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("GITHUB_TOKEN_KEY must be 64 hex characters in server/.env");
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((b) => b.toString("base64")).join(".");
}

export function decrypt(payload) {
  const [iv, tag, encrypted] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}