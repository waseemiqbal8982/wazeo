// Deterministic seeded scheduler tests. Run: npm run test:schedule
import { buildSchedule, lagRuns, type CurveType } from "../lib/schedule";

const CURVES: CurveType[] = ["steady", "slow_start", "bell_peak", "natural_wave", "custom"];

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(cond: boolean, name: string) {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(name);
    console.error(`  ✗ ${name}`);
  }
}

function sum(runs: { quantity: number }[]) {
  return runs.reduce((s, r) => s + r.quantity, 0);
}

function cumulativeNonDecreasing(runs: { minutes: number; quantity: number }[]) {
  const sorted = [...runs].sort((a, b) => a.minutes - b.minutes);
  let acc = 0;
  for (const r of sorted) {
    acc += r.quantity;
    if (acc < 0) return false;
  }
  return true;
}

function uniqueMinutes(runs: { minutes: number }[]) {
  return new Set(runs.map((r) => r.minutes)).size === runs.length;
}

console.log("Schedule suite");

// 1. Exact sums + min + cumulative + no overlap, across many combos.
let combo = 0;
for (const total of [10, 25, 100, 999, 5000, 100000, 1234567]) {
  for (const duration of [15, 60, 180, 4320]) {
    for (const curve of CURVES) {
      for (const min of [1, 10, 50]) {
        const opts: Parameters<typeof buildSchedule>[4] = {
          seed: `ord-${combo}`,
          variation: 20,
          ...(curve === "custom" ? { curvePoints: [0.2, 0.8, 0.5, 1, 0.3] } : {}),
        };
        const runs = buildSchedule(total, duration, curve, min, opts);
        combo++;
        check(runs.length >= 1, `has runs total=${total} dur=${duration} ${curve} min=${min}`);
        check(sum(runs) === total, `exact sum ${total} (got ${sum(runs)}) ${curve}`);
        if (total >= min) {
          check(runs.every((r) => r.quantity >= min), `min respected ${min} ${curve}`);
        }
        check(cumulativeNonDecreasing(runs), `cumulative non-decreasing ${curve}`);
        check(uniqueMinutes(runs), `no overlap ${curve}`);
        check(runs.every((r) => r.minutes >= 0 && r.minutes <= duration), `within window ${curve}`);
      }
    }
  }
}

// 2. Determinism: same seed => same plan.
for (const curve of CURVES) {
  const a = buildSchedule(5000, 720, curve, 10, { seed: "order-abc123", variation: 15 });
  const b = buildSchedule(5000, 720, curve, 10, { seed: "order-abc123", variation: 15 });
  check(JSON.stringify(a) === JSON.stringify(b), `determinism ${curve}`);
  const c = buildSchedule(5000, 720, curve, 10, { seed: "order-abc456", variation: 15 });
  check(JSON.stringify(a) !== JSON.stringify(c), `different seed => different plan ${curve}`);
}

// 3. Tiny quantities (below min => single best-effort run).
{
  const runs = buildSchedule(4, 60, "steady", 10, { seed: "tiny" });
  check(sum(runs) === 4, "tiny exact sum");
  check(runs.length === 1, "tiny single run");
}

// 4. Huge quantities.
{
  const runs = buildSchedule(10_000_000, 4320, "natural_wave", 100, { seed: "huge", variation: 30 });
  check(sum(runs) === 10_000_000, "huge exact sum");
  check(runs.every((r) => r.quantity >= 100), "huge min respected");
}

// 5. 15-minute and 72-hour windows.
{
  const s = buildSchedule(200, 15, "bell_peak", 10, { seed: "15m" });
  check(s.every((r) => r.minutes <= 15), "15m window");
  const h = buildSchedule(200, 4320, "bell_peak", 10, { seed: "72h" });
  check(h.every((r) => r.minutes <= 4320), "72h window");
}

// 6. maxRuns cap.
for (const curve of CURVES) {
  const runs = buildSchedule(100000, 1440, curve, 10, { seed: "cap", maxRuns: 12 });
  check(runs.length <= 12, `maxRuns cap ${curve} (got ${runs.length})`);
}

// 7. Variation bounds (0 and 30) both produce exact sums.
for (const v of [0, 30]) {
  const runs = buildSchedule(777, 600, "natural_wave", 7, { seed: "v", variation: v });
  check(sum(runs) === 777, `variation ${v} exact sum`);
}

// 8. maxRun cap redistributes without changing total or min.
{
  const runs = buildSchedule(1000, 600, "steady", 10, { seed: "maxrun", maxRun: 120 });
  check(sum(runs) === 1000, "maxRun exact sum");
  check(runs.every((r) => r.quantity >= 10), "maxRun min respected");
  check(runs.every((r) => r.quantity <= 120), "maxRun cap respected");
}

// 9. Custom curve determinism + distinct from steady.
{
  const a = buildSchedule(3000, 720, "custom", 10, { seed: "custom1", curvePoints: [0.1, 0.9, 0.3, 1, 0.2] });
  const b = buildSchedule(3000, 720, "custom", 10, { seed: "custom1", curvePoints: [0.1, 0.9, 0.3, 1, 0.2] });
  check(JSON.stringify(a) === JSON.stringify(b), "custom curve determinism");
  check(sum(a) === 3000, "custom curve exact sum");
  const s = buildSchedule(3000, 720, "steady", 10, { seed: "custom1" });
  check(JSON.stringify(a) !== JSON.stringify(s), "custom curve differs from steady");
}

// 10. lagRuns shifts minutes but keeps quantities.
{
  const runs = buildSchedule(100, 60, "steady", 10, { seed: "lag" });
  const lagged = lagRuns(runs, 5);
  check(lagged.length === runs.length, "lag same count");
  check(lagged.every((r, i) => r.minutes === runs[i].minutes + 5), "lag +5 min");
  check(sum(lagged) === 100, "lag preserves sum");
}

console.log(`\nPASS ${passed} · FAIL ${failed}`);
if (failed > 0) {
  console.error("\nFailures:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
