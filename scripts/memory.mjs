#!/usr/bin/env node
/**
 * Wazeo — Project Memory System (permanent context & AI handover)
 * Dependency-free append-only ledger. Never stores raw secrets (scrubbed).
 * Commands: init | log | snapshot | backup | export | restore | list | status
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const DIR = path.join(ROOT, ".wazeo-memory");
const HISTORY = path.join(DIR, "HISTORY.jsonl");
const STATE = path.join(DIR, "STATE.json");
const SNAP = path.join(DIR, "SNAPSHOTS");
const BK = path.join(DIR, "BACKUPS");

const SECRET_RE =
  /(eyJ[A-Za-z0-9_.-]{20,}|sb_publishable_[A-Za-z0-9]+|sb_secret_[A-Za-z0-9]+|sk-[A-Za-z0-9]{16,}|postgresql:\/\/[^\s"']+|Bearer\s+[A-Za-z0-9._-]{20,})/g;

function scrub(v) {
  if (typeof v === "string") return v.replace(SECRET_RE, "[REDACTED]");
  try {
    return JSON.stringify(v).replace(SECRET_RE, "[REDACTED]");
  } catch {
    return String(v);
  }
}
function now() {
  return new Date().toISOString();
}
function uid() {
  return crypto.randomBytes(4).toString("hex");
}
function ensure() {
  for (const d of [DIR, SNAP, BK]) if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  if (!fs.existsSync(HISTORY)) fs.writeFileSync(HISTORY, "");
  if (!fs.existsSync(STATE)) fs.writeFileSync(STATE, JSON.stringify({ version: 1, createdAt: now() }, null, 2));
}
function readLines() {
  if (!fs.existsSync(HISTORY)) return [];
  return fs.readFileSync(HISTORY, "utf8").split("\n").filter(Boolean).map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  }).filter(Boolean);
}
function append(entry) {
  fs.appendFileSync(HISTORY, JSON.stringify(entry) + "\n");
}
function cmdInit() {
  ensure();
  cmdLog("system", "memory.init", "Project memory system initialized", { purpose: "permanent context & AI handover" });
  return { ok: true };
}
function cmdLog(type, actor, message, data) {
  ensure();
  const entries = readLines();
  const last = entries[entries.length - 1];
  if (last && last.type === type && last.message === message) return { ok: true, deduped: true, id: last.id };
  const e = { id: uid(), ts: now(), type, actor: actor || "agent", message: scrub(message) };
  const d = scrub(data);
  if (d !== JSON.stringify({})) e.data = typeof d === "string" ? JSON.parse(d) : d;
  append(e);
  return { ok: true, deduped: false, id: e.id, ts: e.ts };
}
function cmdBackup() {
  ensure();
  if (fs.existsSync(HISTORY)) {
    const name = "HISTORY.jsonl." + Date.now();
    fs.copyFileSync(HISTORY, path.join(BK, name));
    return { ok: true, backup: path.join(BK, name) };
  }
  return { ok: false, error: "no history yet" };
}
function cmdSnapshot() {
  ensure();
  const entries = readLines();
  const state = { version: 1, updatedAt: now(), counts: { entries: entries.length, byType: {} }, last: entries.slice(-8) };
  entries.forEach((e) => {
    state.counts.byType[e.type] = (state.counts.byType[e.type] || 0) + 1;
  });
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
  const snapFile = path.join(SNAP, "snapshot." + Date.now() + ".json");
  fs.writeFileSync(snapFile, JSON.stringify({ ts: now(), count: entries.length, entries: entries.slice(-300) }, null, 2));
  return { ok: true, snapshot: snapFile, state: STATE };
}
function cmdExport(out) {
  ensure();
  const state = JSON.parse(fs.readFileSync(STATE, "utf8"));
  const entries = readLines();
  const doc = { exportedAt: now(), state, history: entries };
  const file = out || path.join(DIR, "EXPORT.json");
  fs.writeFileSync(file, JSON.stringify(doc, null, 2));
  return { ok: true, file };
}
function cmdRestore(from) {
  if (!from) return { ok: false, error: "usage: restore --from <file>" };
  if (!fs.existsSync(from)) return { ok: false, error: "backup file not found: " + from };
  ensure();
  fs.copyFileSync(from, HISTORY);
  return { ok: true, restoredFrom: from };
}
function cmdList(last) {
  const entries = readLines();
  const n = Number(last) > 0 ? Number(last) : 30;
  return entries.slice(-n);
}
function cmdStatus() {
  ensure();
  const entries = readLines();
  return { dir: DIR, entries: entries.length, first: entries[0]?.ts || null, last: entries[entries.length - 1]?.ts || null, lastType: entries[entries.length - 1]?.type || null };
}
const args = process.argv.slice(2);
const cmd = args[0];
const get = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : "";
};
const has = (flag) => args.includes(flag);
function print(o) {
  process.stdout.write(JSON.stringify(o, null, 2) + "\n");
}
let out;
switch (cmd) {
  case "init":
    out = cmdInit();
    break;
  case "log":
    out = cmdLog(get("--type") || "event", get("--actor") || "agent", get("--message"), (() => {
      try {
        return get("--data") ? JSON.parse(get("--data")) : {};
      } catch {
        return {};
      }
    })());
    break;
  case "snapshot":
    out = cmdSnapshot();
    break;
  case "backup":
    out = cmdBackup();
    break;
  case "export":
    out = cmdExport(get("--out") || "");
    break;
  case "restore":
    out = cmdRestore(get("--from"));
    break;
  case "list":
    out = cmdList(has("--last") ? Number(get("--last")) : 30);
    break;
  case "status":
    out = cmdStatus();
    break;
  default:
    out = { error: "unknown command", usage: "init | log | snapshot | backup | export | restore | list | status" };
    process.exitCode = 1;
}
print(out);
