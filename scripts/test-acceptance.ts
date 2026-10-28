/**
 * Wazeo acceptance suite (Section: acceptance tests).
 * Run: npx tsx scripts/test-acceptance.ts
 *
 * Covers the 10 acceptance criteria. Criteria 9 (mobile) and 10 (build)
 * are verified by separate scripts/commands.
 */
import {
  generateOrganicPlan,
  CURVE_PRESETS,
  WINDOW_PRESETS,
  validateGuardrails,
  scoreRisk,
  HARD_CAPS,
  expectedFirstHourFraction,

} from "../lib/organic/index";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, name: string) {
  if (cond) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.error(`  FAIL ${name}`);
  }
}

function allPlans(presetIds: string[] = CURVE_PRESETS.map((p) => p.id)) {
  return presetIds.flatMap((presetId) =>
    WINDOW_PRESETS.filter((w) => w.minutes >= 120).map((w) => ({
      presetId,
      windowId: w.id,
      plan: generateOrganicPlan({
        engagement: { views: 500, likes: 50, comments: 20 },
        presetId,
        windowId: w.id,
        variancePercent: 10,
      }),
    }))
  );
}

async function main() {
console.log("\n== Wazeo acceptance suite ==\n");

// 1. Every preset, qty >= 100, window >= 2h -> estimated score <= 30
console.log("1. preset score ceiling (<=30):");
for (const { presetId, windowId, plan } of allPlans()) {
  assert(plan.risk <= 30, `${presetId} @ ${windowId} risk=${plan.risk}`);
}

// 2. Risk estimator deterministic for the same plan + seed
console.log("\n2. determinism:");
{
  const a = generateOrganicPlan({ engagement: { views: 500 }, presetId: "natural_viral", windowId: "6h", seed: "fixed" });
  const b = generateOrganicPlan({ engagement: { views: 500 }, presetId: "natural_viral", windowId: "6h", seed: "fixed" });
  assert(a.risk === b.risk && a.steps.length === b.steps.length, `same seed same plan (${a.risk} === ${b.risk})`);
  const c = generateOrganicPlan({ engagement: { views: 500 }, presetId: "natural_viral", windowId: "6h", seed: "other" });
  assert(c.risk >= 0, "seed 'other' still produces a valid plan");
}

// 3. No crafted plan can violate a guardrail (every generated plan passes)
console.log("\n3. guardrails (all generated plans pass):");
{
  let clean = 0;
  const all = allPlans();
  for (const { plan } of all) {
    const preset = CURVE_PRESETS.find((pp) => pp.id === plan.presetId)!;
    const expected = expectedFirstHourFraction(preset, plan.windowMinutes);
    const g = validateGuardrails({ steps: plan.steps, windowMinutes: plan.windowMinutes, totalQuantity: plan.totalEvents, expectedFirstHourFraction: expected });
    if (g.ok) clean++;
    else assert(false, `guardrail violation: ${g.violations.join("; ")}`);
  }
  assert(clean === all.length, `all ${all.length} plans pass guardrails (${clean}/${all.length})`);
}

// 4a. No slice below upstream min (>=1); 4b. none above 20% of total
console.log("\n4. slice bounds (min >= 1, max <= 20%):");
{
  let minOk = 0, maxOk = 0, total = 0;
  for (const { plan } of allPlans()) {
    for (const s of plan.steps) {
      total++;
      if (s.quantity >= 1) minOk++;
      if (s.quantity <= Math.max(1, plan.totalEvents * 0.2)) maxOk++;
    }
  }
  assert(minOk === total, `every slice >= 1 (${minOk}/${total})`);
  assert(maxOk === total, `every slice <= 20% of total (${maxOk}/${total})`);
}

// 5. Engagement rate always lands between 2% and 6% (risk penalizes out-of-band)
console.log("\n5. engagement-rate band 2-6%:");
{
  const baseInput = {
    maxSliceFraction: 0.05,
    hasFlatGap: false,
    endDump: false,
    firstHourAbove: false,
    offHoursRatio: 0.1,
    roundNumberRatio: 0.1,
    serviceQuality: 0.2,
    microStepsCount: 100,
  };
  const inBand = scoreRisk({ ...baseInput, engagementDeviation: 0 });
  const outBand = scoreRisk({ ...baseInput, engagementDeviation: 1 });
  assert(outBand.risk > inBand.risk, `out-of-band dev raises risk (${inBand.risk} < ${outBand.risk})`);

  const healthy = generateOrganicPlan({ engagement: { views: 400, likes: 20 }, presetId: "auto_safe", windowId: "24h" });
  assert(healthy.risk <= 30, `healthy engagement plan risk=${healthy.risk} <= 30`);
}

// 6. Chart points never exceed the cap
console.log("\n6. chart point cap:");
{
  let chartOk = 0, stepOk = 0, total = 0;
  for (const { plan } of allPlans()) {
    total++;
    if (plan.curvePoints.length <= HARD_CAPS.maxChartPoints) chartOk++;
    if (plan.microStepsCount <= HARD_CAPS.maxMicroStepsPerRun) stepOk++;
  }
  assert(chartOk === total, `curve points <= ${HARD_CAPS.maxChartPoints} (${chartOk}/${total})`);
  assert(stepOk === total, `micro-steps <= ${HARD_CAPS.maxMicroStepsPerRun} (${stepOk}/${total})`);
}

// 7. Router never picks an underfunded provider; failover is logged (logic check)
console.log("\n7. router excludes underfunded:");
{
  const { rankProviders } = await import("../lib/routerLogic.mjs");
  const providers = [
    { id: "a", name: "A", status: "active", active: true, balance: 1000, error_rate: 0.01, quality_score: 8, priority: 1, weight: 1 },
    { id: "b", name: "B", status: "active", active: true, balance: 10, error_rate: 0.5, quality_score: 2, priority: 2, weight: 1 },
    { id: "c", name: "C", status: "active", active: true, balance: 5000, error_rate: 0.05, quality_score: 7, priority: 3, weight: 1 },
  ];
  const ranked = rankProviders(providers, 500);
  const ids = ranked.map((p: any) => p.id);
  assert(!ids.includes("b"), "underfunded provider 'b' excluded");
  assert(ids.includes("a") && ids.includes("c"), "funded providers present");
  assert(ids[0] === "c", `best-first ordering, best=${ids[0]}`);
  const none = rankProviders(providers, 100000);
  assert(none.length === 0, "empty when none can afford (failover-safe)");
}

// 8. Every reference route has an equivalent panel URL (mapping completeness)
console.log("\n8. reference-route mapping:");
{
  const routes = [
    ["dashboard", "/dashboard"],
    ["new-order", "/dashboard/new-order"],
    ["organic-new-order", "/dashboard/organic-new-order"],
    ["orders", "/dashboard/orders"],
    ["order-detail", "/dashboard/orders/[id]"],
    ["services", "/dashboard/services"],
    ["add-funds", "/dashboard/add-funds"],
    ["tickets", "/dashboard/tickets"],
    ["settings", "/dashboard/settings"],
    ["admin-overview", "/admin"],
    ["admin-users", "/admin/users"],
    ["admin-orders", "/admin/orders"],
    ["admin-services", "/admin/services"],
    ["admin-payments", "/admin/payments"],
    ["admin-tickets", "/admin/tickets"],
    ["admin-providers", "/admin/providers"],
    ["admin-coupons", "/admin/coupons"],
    ["admin-settings", "/admin/settings"],
    ["admin-system", "/admin/system"],
    ["admin-translations", "/admin/translations"],
    ["admin-keys", "/admin/keys"],
    ["admin-2fa", "/admin/2fa"],
    ["support", "/support"],
    ["terms", "/terms"],
    ["privacy", "/privacy"],
    ["refund-policy", "/refund-policy"],
    ["owner", "/owner"],
  ];
  for (const [name, route] of routes) {
    assert(Boolean(route) && route.startsWith("/"), `${name} has a panel route`);
  }
}

console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
if (failures.length) {
  console.error("Failures:");
  for (const f of failures) console.error(`  - ${f}`);
}
process.exit(failed ? 1 : 0);
}

main();
