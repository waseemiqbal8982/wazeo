import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/adminAuth";
import fs from "node:fs";
import path from "node:path";

const MEM = path.join(process.cwd(), ".wazeo-memory");

const SECRET_RE =
  /(eyJ[A-Za-z0-9_.-]{20,}|sb_publishable_[A-Za-z0-9]+|sb_secret_[A-Za-z0-9]+|sk-[A-Za-z0-9]{16,}|postgresql:\/\/[^\s"']+|Bearer\s+[A-Za-z0-9._-]{20,})/g;

function scrub(s: unknown): string {
  try {
    return JSON.stringify(s).replace(SECRET_RE, "[REDACTED]");
  } catch {
    return String(s);
  }
}

function readHistory() {
  try {
    const p = path.join(MEM, "HISTORY.jsonl");
    if (!fs.existsSync(p)) return [];
    return fs
      .readFileSync(p, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function appendLine(line: any) {
  fs.mkdirSync(MEM, { recursive: true });
  fs.appendFileSync(path.join(MEM, "HISTORY.jsonl"), JSON.stringify(line) + "\n");
}

export async function GET() {
  const ok = await isAdminUser();
  if (ok !== true) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const history = readHistory();
  return NextResponse.json({ ok: true, count: history.length, history: history.slice(-50) });
}

export async function POST(req: Request) {
  const ok = await isAdminUser();
  if (ok !== true) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const type = typeof body.type === "string" ? body.type : "event";
  const message = typeof body.message === "string" ? body.message : "";
  const data = body.data && typeof body.data === "object" ? body.data : {};

  const line: any = {
    id: Math.random().toString(36).slice(2, 10),
    ts: new Date().toISOString(),
    actor: "admin-api",
    type,
    message: scrub(message),
  };
  const d = scrub(data);
  if (d !== JSON.stringify({})) {
    try {
      line.data = JSON.parse(d);
    } catch {}
  }

  try {
    appendLine(line);
  } catch {
    return NextResponse.json({ ok: false, error: "store unavailable (read-only filesystem?)" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: line.id });
}
