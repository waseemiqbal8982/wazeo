// Server-only access-key encryption. Full keys are stored ENCRYPTED at rest
// (AES-256-GCM, KEY_ENCRYPTION_SECRET) so the admin can reveal them in full to
// authorized staff, while a keyed HMAC-SHA256 hash (same secret) is used for
// lookups. Plaintext keys are never written to logs. Legacy hash-only rows have
// no encrypted_key and are flagged legacy (unrecoverable → Regenerate).
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

const ALGO = "aes-256-gcm";

// Dev fallback only — never use in production. A real KEY_ENCRYPTION_SECRET is
// required (32+ chars) and is checked by the admin config-status page.
const DEV_KEY = "abcdefghijklmnopqrstuvwxyz012345"; // exactly 32 bytes, dev only

function encryptionKey(): Buffer {
  const env = process.env.KEY_ENCRYPTION_SECRET;
  if (env && env.length >= 32) return Buffer.from(env.slice(0, 32), "utf8");
  return Buffer.from(DEV_KEY, "utf8");
}

// Format: gcm:v1:<iv b64>:<tag b64>:<cipher b64>
export function encryptKey(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `gcm:v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptKey(stored: string | null | undefined): string {
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

// Keyed hash used for lookup (HMAC-SHA256, KEY_ENCRYPTION_SECRET).
export function keyedHash(key: string): string {
  return createHmac("sha256", encryptionKey()).update(String(key)).digest("hex");
}
