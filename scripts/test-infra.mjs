// Integration tests for the multi-provider infrastructure layer.
//
// Run:  npm run test:infra
// Requires SUPABASE_DB_URL in .env.local (same as db:setup).
//
// These tests are safe: they only read schema/RLS state and exercise the pure
// router logic (no order placement, no writes to providers).

import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env.local") });
import pg from "pg";
import { rankProviders } from "../lib/routerLogic.mjs";

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

// ---------- DB schema checks ----------
let client = null;
try {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    throw new Error("SUPABASE_DB_URL missing (set it in .env.local)");
  }
  client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const providerCols = ["api_key_enc", "balance", "balance_at", "balance_stale", "error_rate", "last_ok_at", "low_balance_threshold", "status", "weight", "markup_pct", "concurrency_cap"];
  const { rows: colRows } = await client.query(
    `select column_name from information_schema.columns where table_schema='public' and table_name='providers'`
  );
  const have = new Set(colRows.map((r) => r.column_name));
  const missingCols = providerCols.filter((c) => !have.has(c));
  check("providers has all new columns", missingCols.length === 0, missingCols.join(",") || "all present");

  const tables = ["provider_services", "panel_services", "service_map", "providers"];
  for (const t of tables) {
    const { rows } = await client.query(
      `select to_regclass($1) as cls`, [`public.${t}`]
    );
    check(`table ${t} exists`, rows[0].cls != null);
  }

  // RLS: verify policies exist on each new table (portable via pg_policies)
  for (const t of ["provider_services", "panel_services", "service_map"]) {
    const { rows } = await client.query(
      `select count(*)::int as n from pg_policies where schemaname='public' and tablename=$1`,
      [t]
    );
    check(`RLS policies on ${t}`, Number(rows[0]?.n) > 0, `${rows[0]?.n} policy/policies`);
  }

  // providers RLS policy for admin exists
  const { rows: policies } = await client.query(
    `select policyname from pg_policies where schemaname='public' and tablename='providers'`
  );
  check("providers has admin policy", policies.length > 0, policies.map((p) => p.policyname).join(", "));
} catch (e) {
  check("DB connection / schema", false, String(e));
} finally {
  if (client) await client.end().catch(() => {});
}

// ---------- Pure router logic ----------
// Acceptance: router never picks an underfunded provider; failover excludes them.
const providers = [
  { id: "a", name: "funded-good", active: true, status: "active", balance: 500, error_rate: 0.05, quality_score: 8, priority: 1, weight: 1 },
  { id: "b", name: "underfunded", active: true, status: "active", balance: 5, error_rate: 0.1, quality_score: 9, priority: 0, weight: 1 },
  { id: "c", name: "funded-cheap", active: true, status: "active", balance: 300, error_rate: 0.02, quality_score: 6, priority: 2, weight: 1 },
  { id: "d", name: "paused", active: true, status: "paused", balance: 99999, error_rate: 0, quality_score: 10, priority: 0, weight: 1 },
  { id: "e", name: "stale", active: true, status: "active", balance: 99999, error_rate: 0, quality_score: 10, priority: 0, weight: 1, balance_stale: true },
];

const reqCost = 100;
const ranked = rankProviders(providers, reqCost);
const rankedIds = ranked.map((p) => p.id);

check("router returns at least one provider", ranked.length > 0, `ranked: ${rankedIds.join(",")}`);
check("router never includes underfunded provider", !rankedIds.includes("b"));
check("router never includes paused provider", !rankedIds.includes("d"));
check("router never includes stale provider", !rankedIds.includes("e"));
check("router never returns provider with balance < cost", ranked.every((p) => Number(p.balance) >= reqCost));
check("failover excludes underfunded (best-first ordered)",
  rankedIds[0] === "a" || rankedIds[0] === "c", `best = ${rankedIds[0]}`);

// Edge: all underfunded -> empty list (no route)
const allPoor = providers.map((p) => ({ ...p, balance: 1 }));
check("router returns empty when none can afford", rankProviders(allPoor, reqCost).length === 0);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.error(`\n❌ ${failed.length} failed`);
  process.exit(1);
}
process.exit(0);
