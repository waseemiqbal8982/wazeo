# AUDIT_START.md — Part A Audit (before changes)
Date: 2026-10-30 (UTC). Audit written before any change to the live key system.

## 1. Root cause of failing access keys (exact, two lines)
The customer-visible failure was on the OLD deploy: Vercel's production bundle was missing
the POST handler for `/api/auth/key-redeem` (and other POST routes), so every redeem attempt
returned **405 Method Not Allowed**, which the frontend mapped to the generic
"invalid/expired key" message — regardless of key validity. A secondary, previously-fixed
bug mangled pasted full keys (`WZ-WZ7A-…`) during frontend normalization, corrupting the
lookup value.

## 2. What other tools / git changed in the last 3 days
Scope: `git log --all --since="3 days ago"`, `git status`, `git reflog -n 50`, untracked +
uncommitted files, live schema vs ALL_IN_ONE.sql, Vercel env names vs .env.example, GitHub settings.
(db:setup / live inspect commands were run; Vercel tool is blocked in this session — see step 2 note.)

### Commits (Oct 28–30)
- `acaa891` feat(keys): admin sees full key (AES-256-GCM at rest, keyed hash, legacy regenerate, view audit)
- `1e07e83` feat(keys): server-side password-less sign-in on key bind (magiclink+verifyOtp), key_sessions device tracking (item2 partial)
- `ebb4449` docs: STATUS_REPORT.md (prompt 32b audit) + FEATURES.md updates
- `823c0b9` cline checkpoint (merge of untracked files) — preserved uncommitted work
- `013206e` untracked files on cline checkpoint (key APIs, admin keys UI, audits, test scripts)
- `187572e`/`aee4b1d`/`6c3a971`/`9db4d98` etc.: older cline checkpoints (Oct 29) — snapshot/audit tooling

### Risk flags (R = risky, M = moderate, L = low/severe)
| Change | Severity | Notes |
|---|---|---|
| Server-side password-less sign-in via `admin.generateLink` + `verifyOtp` (key-redeem bind) | M | New auth path; cookies set server-side on the response; OTP fallback kept. Needs test. |
| `key_sessions` table (schema_v26) records ip_hash + user-agent | L | Device tracking only, no RLS policies yet (service-role only). |
| Full-key decryption in admin `GET /api/admin/keys` (returns `full_key`) | M | Only after `isAdminUser`; no full keys in audit log. OK but must stay admin-only. |
| `error_logs` writes on reject (level=info, last4 only, no full key) | L | Good. |
| Uncommitted/untracked work: `lib/accessKeys.ts`, `lib/accessKeyFormat.ts`, `app/api/admin/keys-api`, `app/api/user/keys`, `app/api/v2/me`, AdminApiKeys/CustomerApiKeys components | M | Duplicates the shared key logic; must be consolidated/removed in Part B. |
| `.env.example` defines `KEY_ENCRYPTION_SECRET` | L | Env name must exist on Vercel; not set there yet (Vercel tool blocked, see note). |

### Environmental notes
- `npm run lint` → **0 errors / 48 warnings** (baseline, mostly unused vars / deps).
- `npm run build` → **passes** (all routes compile; POST routes present in build).
- Test scripts present: `test:key`, `test:license`, `test:session`, `test:adminsec`, `test:otp`, `test:schedule`, `test:contrast`, `test:login`, `test:infra`, `test:acceptance`.
- Missing test scripts required by the prompt: `test:links`, `test:dropdowns`, `test:currency`, `test:rls`, `test:permissions`, `test:e2e` — do not exist yet (need to be created).
- Supabase connection was initiated via Composio (OAuth link sent); Vercel toolkit is **blocked in this session** (session restriction) — cannot read Vercel env/deployments with the tool; will note as manual/manual-step.
- `SUPABASE_SERVICE_ROLE_KEY`, `KEY_ENCRYPTION_SECRET` are absent from `.env.local`? (verified by config-status route only at runtime).

## 3. Baseline of failing checks (recorded before changes)
- lint: 0 errors, 48 warnings.
- build: pass.
- test:key: (existing script) — to be run now; reported 78 pass previously.
- test:license, test:session, test:adminsec, test:otp, test:schedule: to be run now.
- All other checks in the prompt (links/dropdowns/currency/rls/permissions/e2e) have no script yet.

## Security plan (do NOT revert except confirmed holes)
- No confirmed live security hole found that requires an immediate revert. The old 405 issue is
  fixed by having POST routes present in build; Part B replaces the entire key system anyway.
- Must rotate: Supabase service_role key + DB password were pasted into earlier chats (manual step, see Part F).
