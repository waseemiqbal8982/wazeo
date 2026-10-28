// Organic engine acceptance tests (Section 12 of the master prompt).
// Run with: npx tsx scripts/test-organic.ts
import {
  generateOrganicPlan,
  CURVE_PRESETS,
  validateGuardrails,
  scoreRisk,
  HARD_CAPS,
} from "../lib/organic/index";

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string) {
  if (cond) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.error(`  FAIL ${name}`);
  }
}

console.log("\n== Organic engine tests ==\n");

// 1. Every preset with qty>=100 and window>=2h yields score <= 30
console.log("1. preset score ceiling (<=30):");
for (const preset of CURVE_PRESETS) {
  const plan = generateOrganicPlan({
    engagement: { views: 500, likes: 50, comments: 20 },
    presetId: preset.id,
    windowId: "2h",
    variancePercent: 10,
  });
  assert(plan.risk <= 30, `${preset.id} risk=${plan.risk}`);
}

// 2. Determinism: same seed -> same score
console.log("\n2. determinism:");
const a = generateOrganicPlan({ engagement: { views: 500 }, presetId: "natural_viral", windowId: "6h", seed: "fixed" });
const b = generateOrganicPlan({ engagement: { views: 500 }, presetId: "natural_viral", windowId: "6h", seed: "fixed" });
assert(a.risk === b.risk, `same seed same risk (${a.risk} === ${b.risk})`);

// 3. Guardrails: micro-step plans obey caps
console.log("\n3. guardrails:");
const plan = generateOrganicPlan({ engagement: { views: 1000, likes: 100 }, presetId: "auto_safe", windowId: "24h" });
assert(plan.microStepsCount <= HARD_CAPS.maxMicroStepsPerRun, `microSteps ${plan.microStepsCount} <= ${HARD_CAPS.maxMicroStepsPerRun}`);
const g = validateGuardrails({ steps: plan.steps, windowMinutes: plan.windowMinutes, totalQuantity: plan.totalEvents });
assert(g.maxSliceFraction < 0.5, `max slice fraction ${(g.maxSliceFraction * 100).toFixed(1)}% < 50%`);

// 4. Non-empty plan sanity
console.log("\n4. rate sanity:");
const p2 = generateOrganicPlan({ engagement: { views: 1000 }, presetId: "steady_organic", windowId: "12h" });
assert(p2.totalEvents > 0 && p2.microStepsCount > 0, "non-empty plan");

// 5. Chart points under cap
console.log("\n5. chart point cap:");
assert(plan.curvePoints.length <= HARD_CAPS.maxChartPoints, `points ${plan.curvePoints.length} <= ${HARD_CAPS.maxChartPoints}`);

// 6. Risk estimator correctness
console.log("\n6. risk estimator:");
const r = scoreRisk({ maxSliceFraction: 0.1, hasFlatGap: false, endDump: false, engagementDeviation: 0, firstHourAbove: false, offHoursRatio: 0.1, roundNumberRatio: 0.1, serviceQuality: 0.2, microStepsCount: 120 });
assert(r.risk >= 0 && r.risk <= 30, `score ${r.risk} in range`);

console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
