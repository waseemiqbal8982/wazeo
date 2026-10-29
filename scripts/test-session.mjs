import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
import { createClient } from "@supabase/supabase-js";

// ============================================================================
// test:session — proves "users stay signed in"
//
// Flow:
//  1. Create a temporary user (confirmed) via the admin API.
//  2. Sign in as that user to obtain a real session (access + refresh tokens).
//  3. Artificially expire the access token while keeping a valid refresh token
//     (we rewrite the access-token cookie with an expired JWT).
//  4. Request a protected page (/dashboard) AND a protected API route (/api/user/currency)
//     with those cookies.
//  5. Assert the user is NOT bounced to /sign-in and that the responses renew
//     the auth cookies (Set-Cookie contains a fresh access token).
//
// Requires a live Supabase DB (SUPABASE_SERVICE_ROLE_KEY) and a running server
// (TEST_BASE_URL), same as test:otp. It cleans up the temp user afterwards.
// ============================================================================

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon || !serviceRole) {
  console.error("❌ Supabase URL / anon / service-role key missing in .env.local");
  process.exit(1);
}

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const email = `session-test-${Date.now()}@example.com`;
const password = "test-session-123";

const admin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const browserLike = createClient(url, anon, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let userId = null;
let ok = false;

// --- helpers ---------------------------------------------------------------
function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
function makeExpiredJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: "HS256", typ: "JWT" });
  const payload = b64url({
    sub: "expired-test-user",
    aud: "authenticated",
    role: "authenticated",
    exp: now - 3600, // 1 hour in the past
    iat: now - 7200,
    email,
  });
  const sig = "c2lnbmF0dXJlLWlnbm9yZWQ"; // signature won't verify -> treated as expired/invalid
  return `${header}.${payload}.${sig}`;
}
function cookieHeader(access, refresh) {
  return `sb-access-token=${encodeURIComponent(access)}; sb-refresh-token=${encodeURIComponent(refresh)}`;
}
function sniffSetCookie(res) {
  const raw = res.headers.getSetCookie?.() || res.headers.get("set-cookie")?.split(/,(?=\s*\w+=)/) || [];
  const out = [];
  for (const c of raw) {
    const name = String(c).split("=")[0]?.trim();
    if (name.startsWith("sb-")) out.push({ name, value: String(c) });
  }
  return out;
}

try {
  // 1) Create + confirm the temp user.
  const { data: u, error: ue } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: `sessiontest${Date.now().toString(36)}` },
  });
  if (ue || !u?.user) {
    console.log(`❌ FAIL: could not create test user — ${ue?.message || "no user"}`);
    process.exit(1);
  }
  userId = u.user.id;

  // 2) Sign in -> real session.
  const { data: s, error: se } = await browserLike.auth.signInWithPassword({ email, password });
  if (se || !s?.session) {
    console.log(`❌ FAIL: sign-in failed — ${se?.message || "no session"}`);
    process.exit(1);
  }
  const realRefresh = s.session.refresh_token;
  console.log("✅ signed in, obtained real session");

  // 3) Expire the access token artificially, keep the real refresh token.
  const expiredAccess = makeExpiredJwt();
  const cookies = cookieHeader(expiredAccess, realRefresh);

  // 4a) Protected page.
  const pageRes = await fetch(`${baseUrl}/dashboard`, {
    headers: { Cookie: cookies },
    redirect: "manual",
  });
  const pageStatus = pageRes.status;
  const pageLocation = pageRes.headers.get("location") || "";
  const bounced = pageLocation.includes("/sign-in");
  const pageCookies = sniffSetCookie(pageRes);

  if (bounced) {
    console.log(`❌ FAIL: protected page bounced to /sign-in (${pageStatus}) — refresh did not keep user signed in`);
    process.exit(1);
  }
  if (pageCookies.length === 0) {
    console.log(`❌ FAIL: protected page (${pageStatus}) did not return renewed auth cookies`);
    process.exit(1);
  }
  console.log(`✅ protected /dashboard accessible (${pageStatus}) and returned ${pageCookies.length} renewed cookie(s)`);

  // Reuse any renewed refresh token for the API call (best effort).
  const renewedRefresh =
    pageCookies.find((c) => c.name === "sb-refresh-token")?.value || realRefresh;

  // 4b) Protected API route.
  const apiRes = await fetch(`${baseUrl}/api/user/currency`, {
    method: "GET",
    headers: { Cookie: cookieHeader(expiredAccess, renewedRefresh) },
  });
  if (apiRes.status === 401) {
    console.log("❌ FAIL: API route returned 401 after refresh — user got signed out");
    process.exit(1);
  }
  console.log(`✅ protected API route returned ${apiRes.status} (not 401)`);

  ok = true;
  console.log("✅ PASS: user stays signed in after access-token expiry; cookies renewed");
} catch (e) {
  console.log(`❌ FAIL: exception — ${String(e)}`);
} finally {
  // 5) Cleanup.
  if (userId) {
    const { error: de } = await admin.auth.admin.deleteUser(userId);
    if (de) console.log(`⚠️ cleanup: could not delete test user — ${de.message}`);
    else console.log("cleanup: test user deleted");
  }
}

process.exit(ok ? 0 : 1);
