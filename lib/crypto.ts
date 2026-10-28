import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Encrypts provider API keys at rest using AES-256-GCM.
//
// The key must be provided via `PROVIDER_ENC_KEY` (32+ chars). If it is not
// configured, a deterministic DEVELOPMENT key is used so the app still runs in
// local/mock mode. You MUST set PROVIDER_ENC_KEY in production — the dev key is
// not secret.
const DEV_KEY = "0123456789abcdef0123456789abcdef"; // 32 bytes, dev only
const ALGO = "aes-256-gcm";

function encryptionKey(): Buffer {
  const env = process.env.PROVIDER_ENC_KEY;
  if (env && env.length >= 32) return Buffer.from(env.slice(0, 32), "utf8");
  return Buffer.from(DEV_KEY, "utf8");
}

// Format: gcm:v1:<iv b64>:<tag b64>:<cipher b64>
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `gcm:v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(stored: string | null | undefined): string {
  if (!stored) return "";
  const parts = stored.split(":");
  if (parts.length !== 5 || parts[0] !== "gcm" || parts[1] !== "v1") return "";
  try {
    const iv = Buffer.from(parts[2], "base64");
    const tag = Buffer.from(parts[3], "base64");
    const enc = Buffer.from(parts[4], "base64");
    const decipher = createDecipheriv(ALGO, encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export function maskKey(k?: string | null): string {
  if (!k) return "";
  if (k.length <= 4) return "••••";
  return "••••••••" + k.slice(-4);
}
