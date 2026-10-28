import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Owner" };
export const dynamic = "force-dynamic";

export default async function OwnerPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("settings").select("key, value");
  const map: Record<string, string> = {};
  (rows || []).forEach((r) => { map[r.key] = r.value; });

  const name = map.owner_name || "Your Name";
  const bio = map.owner_bio || "Entrepreneur & full-stack developer. This section is editable from the admin panel.";
  const contact = map.owner_contact || "";
  const email = map.owner_email || "";

  let skills: string[] = [];
  let projects: { title: string; description: string }[] = [];
  try { skills = JSON.parse(map.owner_skills || "[]"); } catch {}
  try { projects = JSON.parse(map.owner_projects || "[]"); } catch {}

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="text-sm text-[var(--accent)]">← Home</Link>

      <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent-soft)] text-4xl font-bold text-[var(--accent)]">
          {name.slice(0, 1)}
        </div>
        <h1 className="mt-4 text-3xl font-bold">{name}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--text-muted)]">{bio}</p>
      </div>

      {skills.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Skills</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s} className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm">{s}</span>
            ))}
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Projects</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {projects.map((p, i) => (
              <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(contact || email) && (
        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-semibold">Contact</h2>
          <div className="mt-2 space-y-1 text-sm">
            {contact && <p>{contact}</p>}
            {email && <p>{email}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
