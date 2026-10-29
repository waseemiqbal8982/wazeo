// Session persistence helper for "Stay signed in".
//
// The product default is "Stay signed in = ON": auth cookies get a long
// maxAge (~400 days) so users remain signed in across browser restarts.
// When the user explicitly turns "Stay signed in" OFF, the value is stored in
// the `wazeo-stay-signed-in` cookie as "0", and auth cookies fall back to
// session cookies (cleared when the browser session ends).

export const STAY_SIGNED_IN_COOKIE = "wazeo-stay-signed-in";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 400; // ~400 days

/** True unless the user explicitly opted out with cookie value "0". */
export function staySignedInEnabled(value: string | null | undefined): boolean {
  return value !== "0";
}

/** Cookie maxAge in seconds, or undefined for a session cookie. */
export function sessionMaxAge(enabled: boolean): number | undefined {
  return enabled ? SESSION_MAX_AGE : undefined;
}
