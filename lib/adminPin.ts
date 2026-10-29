import { scryptSync, randomBytes, createHash, timingSafeEqual } from "node:crypto";

// ---- PIN hashing (salted slow scrypt) ----
const SCRYPT_KEYLEN = 32;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 };

export function hashPin(pin: string, salt = randomBytes(16).toString("hex")): {
  hash: string;
  salt: string;
  algo: string;
} {
  const derived = scryptSync(pin, salt, SCRYPT_KEYLEN, SCRYPT_OPTS);
  return { hash: derived.toString("hex"), salt, algo: "scrypt" };
}

export function verifyPin(pin: string, salt: string, expectedHash: string): boolean {
  try {
    const derived = scryptSync(String(pin), salt, SCRYPT_KEYLEN, SCRYPT_OPTS);
    const a = Buffer.from(derived.toString("hex"), "hex");
    const b = Buffer.from(expectedHash, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ---- Recovery codes ----
export const RECOVERY_CODE_COUNT = 8;

export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  const codes: string[] = [];
  while (codes.length < count) {
    const code = randomBytes(5).toString("hex").toUpperCase();
    codes.push(code);
  }
  return codes;
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(String(code)).digest("hex");
}

export function verifyRecoveryCode(code: string, expectedHash: string): boolean {
  const h = createHash("sha256").update(String(code)).digest("hex");
  const a = Buffer.from(h, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---- Device-session cookie ----
export const PIN_COOKIE_PREFIX = "wazeo-adminpin-ok-";
export const PIN_INACTIVITY_MS = 12 * 60 * 60 * 1000; // 12 hours
export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCK_MS = 15 * 60 * 1000; // 15 minutes
