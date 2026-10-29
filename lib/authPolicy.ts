import { getSetting, getSettingJson } from "./settings";

// Auth / security policy helpers (server-side only).
//
// The product default is "Require email verification at sign-up = OFF", meaning
// sign-up creates a confirmed user via the admin API (no verification email),
// signs the user in, and opens the dashboard. When the admin turns the switch
// ON, the legacy OTP / confirmation-link verification flow is enforced instead.

export const EMAIL_VERIFY_SETTING = "require_email_verify_at_signup";
export const DISPOSABLE_DOMAINS_SETTING = "disposable_email_domains";

/** True when the admin wants sign-up to require email verification (OTP/link). */
export async function requireEmailVerifyAtSignup(): Promise<boolean> {
  const v = await getSetting(EMAIL_VERIFY_SETTING);
  return v === "true";
}

/** Editable list of disposable-email domains to reject at sign-up. */
export async function getDisposableEmailDomains(): Promise<string[]> {
  const domains = await getSettingJson<string[]>(DISPOSABLE_DOMAINS_SETTING, []);
  return Array.isArray(domains) ? domains.map((d) => String(d).trim().toLowerCase().replace(/^\./, "")).filter(Boolean) : [];
}

/** Check whether an email's domain is disposable. */
export async function isDisposableEmail(email: string): Promise<boolean> {
  if (!email || !email.includes("@")) return false;
  const domain = email.trim().toLowerCase().split("@")[1] || "";
  const list = await getDisposableEmailDomains();
  const normalized = domain.replace(/^\./, "");
  return list.includes(normalized) || list.some((d) => d === "" ? false : domain === d || domain.endsWith(`.${d}`));
}
