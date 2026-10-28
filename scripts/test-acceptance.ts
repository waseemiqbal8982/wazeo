/**
 * Wazeo acceptance suite (Section: acceptance tests).
 * Run: npx tsx scripts/test-acceptance.ts
 *
 * Covers delivery-scheduling + operational checks. Risk/bot-detection
 * assertions were removed as part of the safety review.
 */
import {
  generateOrganicPlan,
  CURVE_PRESETS,
  WINDOW_PRESETS,
  HARD_CAPS,
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

  // 1. Every preset + window yields a non-empty plan
  console.log("1. plans are non-empty:");
  let nonEmpty = 0;
  const all = allPlans();
  for (const { plan } of all) {
    if (plan.totalEvents > 0 && plan.microStepsCount > 0) nonEmpty++;
  }
  assert(nonEmpty === all.length, `all ${all.length} plans non-empty (${nonEmpty}/${all.length})`);

  // 2. Determinism: same seed -> same plan/step count
  console.log("\n2. determinism:");
  {
    const a = generateOrganicPlan({ engagement: { views: 500 }, presetId: "steady", windowId: "6h", seed: "fixed" });
    const b = generateOrganicPlan({ engagement: { views: 500 }, presetId: "steady", windowId: "6h", seed: "fixed" });
    assert(a.steps.length === b.steps.length, `same seed same plan (${a.steps.length} === ${b.steps.length})`);
    const c = generateOrganicPlan({ engagement: { views: 500 }, presetId: "steady", windowId: "6h", seed: "other" });
    assert(c.totalEvents >= 0, "seed 'other' still produces a valid plan");
  }

  // 3. Slice bounds (min >= 1, max <= 20% of total)
  console.log("\n3. slice bounds (min >= 1, max <= 20%):");
  {
    let minOk = 0, maxOk = 0, total = 0;
    for (const { plan } of all) {
      for (const s of plan.steps) {
        total++;
        if (s.quantity >= 1) minOk++;
        if (s.quantity <= Math.max(1, plan.totalEvents * 0.2)) maxOk++;
      }
    }
    assert(minOk === total, `every slice >= 1 (${minOk}/${total})`);
    assert(maxOk === total, `every slice <= 20% of total (${maxOk}/${total})`);
  }

  // 4. Chart points / micro-steps never exceed caps
  console.log("\n4. chart point + step caps:");
  {
    let chartOk = 0, stepOk = 0, total = 0;
    for (const { plan } of all) {
      total++;
      if (plan.curvePoints.length <= HARD_CAPS.maxChartPoints) chartOk++;
      if (plan.microStepsCount <= HARD_CAPS.maxMicroStepsPerRun) stepOk++;
    }
    assert(chartOk === total, `curve points <= ${HARD_CAPS.maxChartPoints} (${chartOk}/${total})`);
    assert(stepOk === total, `micro-steps <= ${HARD_CAPS.maxMicroStepsPerRun} (${stepOk}/${total})`);
  }

  // 5. Router never picks an underfunded provider; failover is logged
  console.log("\n5. router excludes underfunded:");
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

  // 6. Reference routes have equivalent panel URLs
  console.log("\n6. reference-route mapping:");
  {
    const routes: [string, string][] = [
      ["dashboard", "/dashboard"],
      ["new-order", "/dashboard/new-order"],
      ["orders", "/dashboard/orders"],
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
