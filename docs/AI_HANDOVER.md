# 🤝 Wazeo — AI Handover / Onboarding

This project keeps a **permanent memory** so any AI coding agent or API provider
can resume exactly where the last one stopped — no re-explanation needed.

## How a new agent should start

1. **Read `project.html`** (repo root) — the structured, secret-free summary of
   architecture, status, completed/pending work, env-variable names, known
   issues, and recent decisions.
2. **Read the docs:** `STATUS.md`, `TASKS.md`, `FEATURES.md`, `README.md`.
3. **Load the memory ledger:**
   - `node scripts/memory.mjs status`            — counts / first / last entry
   - `node scripts/memory.mjs list --last 80`   — recent decisions & fixes
   - Full history file: `.wazeo-memory/HISTORY.jsonl`
   - Snapshots: `.wazeo-memory/SNAPSHOTS/` · Backups: `.wazeo-memory/BACKUPS/`
4. **Inspect the code:** `package.json`, `next.config.ts`, `app/`, `components/`,
   `lib/`, `supabase/`, `scripts/`.
5. **Verify the baseline:** `npm run lint` and `npm run build` (must pass)
   before making changes.
6. **Record your work:** log decisions/fixes as you go:
   - `node scripts/memory.mjs log --type decision --actor agent --message "..." [--data '{"k":"v"}']`
   - Rebuild summary: `node scripts/generate-project-html.mjs` (regenerates `project.html`).
   - Snapshot: `node scripts/memory.mjs snapshot`

## Admin API (optional, for review/recording over HTTP)

- `GET  /api/memory`  — recent history (admin only)
- `POST /api/memory`  — append an event (admin only), body `{ type, message, data? }`

## Security rules

- **Never** log, commit, or embed real secrets (API keys, tokens, passwords,
  service-role keys, DB credentials) — not in `project.html`, not in memory
  files, not in client code. Use environment variables only; record only their
  **names** and configuration status.
- The memory scrubber (`SECRET_RE` in `scripts/memory.mjs`) redacts common
  secret formats on write. Do not bypass it.

## Utilities

| Command | Purpose |
|---|---|
| `node scripts/memory.mjs init` | create store + baseline entry |
| `node scripts/memory.mjs log --type <t> --message "..." [--data '{...}']` | append (dedup) |
| `node scripts/memory.mjs snapshot` | write STATE.json + timestamped snapshot |
| `node scripts/memory.mjs backup` | copy ledger to BACKUPS/ |
| `node scripts/memory.mjs export [--out f.json]` | consolidated export |
| `node scripts/memory.mjs restore --from <file>` | restore ledger from a backup |
| `node scripts/memory.mjs list [--last N]` / `status` | review |
| `node scripts/generate-project-html.mjs` | regenerate `project.html` |
