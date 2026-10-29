"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

export function RateOrder({ orderId }: { orderId: string }) {
  const supabase = createClient();
  const { toast } = useToast();
  const [existing, setExisting] = useState<null | { id: string; rating: number; text: string; show_first_name: boolean; status: string }>(null);
  const [checked, setChecked] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [showFirstName, setShowFirstName] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("reviews")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setExisting(data);
        setChecked(true);
      });
  }, [orderId]);

  if (!checked) return null;

  if (existing) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="text-sm font-semibold">Your review</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          You rated this order {existing.rating}/5.{" "}
          {existing.status === "approved"
            ? "It is published on our site — thank you!"
            : existing.status === "hidden"
            ? "This review was hidden by an admin."
            : "It is awaiting approval by an admin and will appear shortly."}
        </p>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return toast({ title: "Please pick a star rating.", variant: "danger" });
    setBusy(true);
    let authorDisplay: string | null = null;
    if (showFirstName) {
      const { data: me } = await supabase.auth.getUser();
      if (me?.user?.id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, username")
          .eq("id", me.user.id)
          .maybeSingle();
        const raw = prof?.full_name || prof?.username || "";
        const first = raw.split(/\s+/)[0] || "";
        if (first) authorDisplay = first;
      }
    }
    const { error } = await supabase.from("reviews").insert({
      order_id: orderId,
      rating,
      text: text.trim(),
      show_first_name: showFirstName,
      author_display: authorDisplay,
    });
    setBusy(false);
    if (error) {
      return toast({ title: error.message, variant: "danger" });
    }
    toast({ title: "Thanks! Your review was submitted for approval.", variant: "success" });
    supabase.from("reviews").select("*").eq("order_id", orderId).maybeSingle().then(({ data }) => {
      if (data) setExisting(data);
    });
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-sm font-semibold">Rate this order</p>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Your honest review helps others. Only approved reviews appear on the public site.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className={cn("h-11 w-11 text-2xl text-amber-400 active:scale-90", n <= rating ? "" : "opacity-30")}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Share a short review (optional)…"
          className="w-full rounded-xl border border-[var(--border)] bg-white/[0.03] p-3 text-sm focus:border-[var(--accent)] focus:outline-none"
        />
        <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <input type="checkbox" checked={showFirstName} onChange={(e) => setShowFirstName(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          Show only my first name
        </label>
        <Button type="submit" loading={busy}>Submit review</Button>
      </form>
    </div>
  );
}
