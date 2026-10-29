#!/usr/bin/env node
/**
 * npm run test:contrast
 * WCAG AA contrast audit via Playwright + axe-core (color-contrast rule)
 * plus a custom border-contrast check for input/control borders.
 * Runs over landing/sign-in/dashboard/orders/services/wallet/support/
 * settings/admin pages, in light + dark, for every theme (+ neutral).
 */
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = process.env.PORT || 3111;
const BASE = `http://localhost:${PORT}`;

const FAST = process.env.CONTRAST_FAST === "1";

const THEMES = FAST
  ? ["purple", "neutral"]
  : ["purple", "cyan", "emerald", "rose", "amber", "ocean", "crimson", "amoled", "neutral"];
const MODES = ["light", "dark"];

const ROUTES = FAST
  ? [
      { path: "/", label: "landing" },
      { path: "/sign-in", label: "sign-in" },
      { path: "/dashboard", label: "dashboard" },
      { path: "/admin", label: "admin-overview" },
    ]
  : [
  { path: "/", label: "landing" },
  { path: "/sign-in", label: "sign-in" },
  { path: "/sign-up", label: "sign-up" },
  { path: "/dashboard", label: "dashboard" },
  { path: "/dashboard/new-order", label: "new-order" },
  { path: "/dashboard/orders", label: "orders" },
  { path: "/dashboard/services", label: "services" },
  { path: "/dashboard/add-funds", label: "wallet" },
  { path: "/support", label: "support" },
  { path: "/dashboard/settings", label: "settings" },
  { path: "/admin", label: "admin-overview" },
  { path: "/admin/users", label: "admin-users" },
  { path: "/admin/orders", label: "admin-orders" },
  { path: "/admin/services", label: "admin-services" },
  { path: "/admin/payments", label: "admin-payments" },
  { path: "/admin/providers", label: "admin-providers" },
  { path: "/admin/tickets", label: "admin-tickets" },
  { path: "/admin/keys", label: "admin-keys" },
  { path: "/admin/settings", label: "admin-settings" },
  { path: "/admin/system", label: "admin-system" },
];

function startServer() {
  const buildReady = existsSync(path.join(ROOT, ".next", "BUILD_ID"));
  const args = buildReady ? ["next", "start", "-p", String(PORT)] : ["next", "dev", "-p", String(PORT)];
  const child = spawn("npx", args, { cwd: ROOT, shell: true, stdio: "ignore" });
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 90000;
    const poll = async () => {
      try {
        const res = await fetch(`${BASE}/`, { method: "GET" });
        if (res.status >= 200 && res.status < 500) return resolve(child);
      } catch {}
      if (Date.now() > deadline) return reject(new Error("server did not become ready"));
      setTimeout(poll, 500);
    };
    poll();
  });
}

// --- contrast helpers ---
function parseColor(color) {
  if (!color) return null;
  const m = color.trim().match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(",").map((s) => parseFloat(s));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  const h = color.trim().match(/^#([0-9a-f]{3,8})$/i);
  if (h) {
    let hex = h[1];
    if (hex.length === 3 || hex.length === 4) hex = hex.split("").map((c) => c + c).join("");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  return null;
}
function blend(fg, bg) {
  if (!fg) return bg;
  const a = fg.a ?? 1;
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  };
}
function lum({ r, g, b }) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const la = lum(a);
  const lb = lum(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

async function customChecks(page) {
  const sel = 'input, select, textarea, button[class*="border"], [class*="border-input"]';
  const results = await page.evaluate((selStr) => {
    const els = Array.from(document.querySelectorAll(selStr));
    const out = [];
    for (const el of els) {
      const cs = getComputedStyle(el);
      const borderColor = cs.borderColor;
      const bg = cs.backgroundColor;
      if (borderColor && borderColor !== "rgba(0, 0, 0, 0)" && cs.borderWidth !== "0px" && el.offsetWidth > 0) {
        out.push({ tag: el.tagName, cls: el.className?.toString().slice(0, 80), borderColor, bg });
      }
    }
    return out;
  }, sel);
  const failures = [];
  for (const item of results) {
    const bc = parseColor(item.borderColor);
    const bg = parseColor(item.bg) || { r: 255, g: 255, b: 255, a: 1 };
    if (!bc) continue;
    const eff = blend({ ...bc }, bg);
    const r = contrast(eff, bg);
    if (r < 3) failures.push(item);
  }
  return failures;
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch();
  const allViolations = [];
  const borderFailures = [];
  let combos = 0;

  try {
    for (const mode of MODES) {
      for (const theme of THEMES) {
        for (const route of ROUTES) {
          combos++;
          const context = await browser.newContext();
          const page = await context.newPage();
          await page.addInitScript(([t, m]) => {
            try {
              localStorage.setItem("wazeo-theme", t);
              localStorage.setItem("wazeo-mode", m);
              document.cookie = `wazeo-theme=${encodeURIComponent(t)}; path=/; max-age=31536000`;
              document.cookie = `wazeo-mode=${m}; path=/; max-age=31536000`;
            } catch {}
          }, [theme, mode]);
          try {
            await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
            await page.waitForTimeout(1800);
            const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
            for (const v of results.violations) {
              for (const n of v.nodes) {
                allViolations.push({ route: route.label, mode, theme, rule: v.id, target: (n.target || []).join(" "), summary: n.failureSummary });
              }
            }
            const bf = await customChecks(page);
            for (const f of bf) borderFailures.push({ route: route.label, mode, theme, ...f });
          } catch (e) {
            console.log(`  skip ${route.label} ${mode}/${theme}: ${e.message}`);
          } finally {
            await context.close();
          }
        }
      }
    }
  } finally {
    await browser.close();
    server.kill();
  }

  console.log(`\nScanned ${combos} combos (${ROUTES.length} routes x ${THEMES.length} themes x ${MODES.length} modes)`);
  console.log(`axe color-contrast violations: ${allViolations.length}`);
  console.log(`custom border-contrast failures: ${borderFailures.length}`);

  for (const v of allViolations.slice(0, 25)) {
    console.log(`  [${v.mode}/${v.theme}] ${v.route} :: ${v.target} :: ${v.summary?.split("\n")[1] || v.summary}`);
  }
  for (const f of borderFailures.slice(0, 15)) {
    console.log(`  BORDER [${f.mode}/${f.theme}] ${f.route} :: <${f.tag}> ${f.cls} ${f.borderColor} on ${f.bg}`);
  }

  if (allViolations.length > 0 || borderFailures.length > 0) {
    console.log("\nRESULT: FAIL (contrast violations found)");
    process.exit(1);
  }
  console.log("\nRESULT: PASS (zero contrast violations)");
}

main().catch((e) => {
  console.error("test:contrast error:", e.message);
  process.exit(2);
});

