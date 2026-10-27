"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function AdminAnnouncements() {
  const supabase = createClient();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function load() {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!title.trim() || !body.trim()) return toast({ title: "Title and body required", variant: "danger" });
    await supabase.from("announcements").insert({ title: title.trim(), body: body.trim() });
    setTitle("");
    setBody("");
    toast({ title: "Announcement created", variant: "success" });
    load();
  }

  async function toggle(item: any) {
    await supabase.from("announcements").update({ active: !item.active }).eq("id", item.id);
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Announcements</h1>

      <div className="glass max-w-xl space-y-3 rounded-2xl p-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Body</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
            className="w-full rounded-xl border border-[var(--border)] bg-white/[0.03] p-3 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none" />
        </div>
        <Button onClick={create}>Create</Button>
      </div>

      <div className="space-y-2">
        {items.map((a) => (
          <div key={a.id} className="glass flex items-start justify-between gap-3 rounded-2xl p-4">
            <div>
              <p className="font-medium">{a.title}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{a.body}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{formatDateTime(a.created_at)}</p>
            </div>
            <Button size="sm" variant={a.active ? "soft" : "outline"} onClick={() => toggle(a)}>
              {a.active ? "Live" : "Draft"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
