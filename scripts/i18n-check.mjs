import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const langs = ["en", "ur", "hi", "fr", "zh"];
const load = (l) =>
  JSON.parse(readFileSync(new URL(`../locales/${l}.json`, import.meta.url), "utf8"));

const base = load("en");
const baseKeys = Object.keys(base);
let fail = false;

for (const l of langs) {
  const d = load(l);
  for (const k of baseKeys) {
    if (!(k in d)) {
      console.error(`MISSING ${l}: ${k}`);
      fail = true;
    }
  }
  const extra = Object.keys(d).filter((k) => !baseKeys.includes(k));
  if (extra.length) console.warn(`NOTE ${l}: ${extra.length} extra key(s) not in en (ignored)`);
}

if (fail) {
  console.error("❌ i18n check FAILED — missing keys above.");
  process.exit(1);
} else {
  console.log("✅ i18n: all keys present in all 5 languages.");
}
