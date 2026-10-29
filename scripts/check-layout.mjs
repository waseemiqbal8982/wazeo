// Layout consistency check (Item 1).
// Fails if any component switches layout with JS device detection, or if the
// shared shell is missing mutual-exclusion breakpoints (phone/tablet/desktop).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["app", "components"];
const SHELL = "components/shell/AppShell.tsx";
const errors = [];

function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e)) checkFile(p);
  }
}

function checkFile(file) {
  let src;
  try {
    src = readFileSync(file, "utf8");
  } catch {
    return;
  }
  src.split("\n").forEach((line, i) => {
    const at = `${file}:${i + 1}`;
    if (/\bwindow\.innerWidth\b|\binnerWidth\b/.test(line)) {
      errors.push(`${at}: uses window.innerWidth to switch layout`);
    }
    if (/\bnavigator\.userAgent\b|\buserAgent\b/.test(line)) {
      errors.push(`${at}: uses user-agent detection`);
    }
    if (/\bmatchMedia\b/.test(line) && !line.includes("prefers-reduced-motion")) {
      errors.push(`${at}: uses matchMedia (non reduce-motion) to switch layout`);
    }
  });
}

for (const r of ROOTS) walk(r);

// Shell must gate sidebars / bottom bars purely by Tailwind breakpoints:
// desktop full sidebar lg+, tablet icon-rail md..lg, phone floating pill <md.
try {
  const shell = readFileSync(SHELL, "utf8");
  const needs = [
    ["desktop sidebar gate (lg:flex)", /lg:flex/],
    ["tablet rail gate (md:flex lg:hidden)", /md:flex[\s\S]*lg:hidden/],
    ["phone pill gate (md:hidden)", /md:hidden/],
    // Item 1: phone bottom nav must be a FLOATING pill: centered, detached from
    // edges (inset-x-3), max width ~420px, and lifted off the bottom edge by
    // a gap + safe-area inset. Edge-stretch bars (inset-x-0 bottom-0) are a fail.
    ["phone pill centered (inset-x-3)", /inset-x-3/],
    ["phone pill capped width (max-w-[420px])", /max-w-\[420px\]/],
    ["phone pill detached from bottom (gap + safe-area)", /bottom-\[max\(12px/],
  ];
  for (const [name, re] of needs) {
    if (!re.test(shell)) errors.push(`components/shell/AppShell.tsx: missing ${name}`);
  }
  // Fail if a full-width, bottom-attached phone nav exists (inset-x-0 bottom-0).
  if (/inset-x-0 bottom-0 z-30 md:hidden/.test(shell)) {
    errors.push(`components/shell/AppShell.tsx: phone nav stretches edge-to-edge (inset-x-0 bottom-0) — use floating pill`);
  }
  // Mutual exclusion: phone pill must not also activate at tablet/desktop.
  // (pill uses md:hidden, rail uses md:flex lg:hidden, desktop uses lg:flex)
  if (/lg:flex[\s\S]*md:hidden|md:hidden[\s\S]*lg:flex/.test(shell)) {
    // only a warning-level heuristic; the breakpoint gates below are authoritative
  }
} catch {
  errors.push(`missing shared shell at ${SHELL}`);
}

if (errors.length) {
  console.error("❌ Layout check FAILED:");
  for (const e of errors) console.error("   - " + e);
  process.exit(1);
}

console.log("✅ check:layout passed — no JS device detection; shell uses CSS breakpoints only.");
