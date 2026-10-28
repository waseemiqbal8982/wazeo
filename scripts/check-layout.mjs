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
// desktop full sidebar lg+, tablet icon-rail md..lg, phone bottom bar <md.
try {
  const shell = readFileSync(SHELL, "utf8");
  const needs = [
    ["desktop sidebar gate (lg:flex)", /lg:flex/],
    ["tablet rail gate (md:flex lg:hidden)", /md:flex[\s\S]*lg:hidden/],
    ["phone bottom bar gate (md:hidden)", /md:hidden/],
  ];
  for (const [name, re] of needs) {
    if (!re.test(shell)) errors.push(`components/shell/AppShell.tsx: missing ${name}`);
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
