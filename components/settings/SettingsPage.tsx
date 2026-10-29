"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/ThemeProvider";
import { THEMES } from "@/lib/constants";
import { ThemeModeToggle } from "@/components/ui/ThemeModeToggle";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { NotificationsSection } from "./NotificationsSection";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";

export function SettingsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const { theme, setTheme, reduceMotion, setReduceMotion } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
      setUsername(data?.username || "");
      const { data: n } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
      setNotifs(n || []);
    })();
  }, []);

  async function saveUsername() {
    if (username.trim().length < 3) return toast({ title: "Username too short", variant: "danger" });
    const { error } = await supabase.rpc("update_profile", { p_username: username.trim() });
    if (error) return toast({ title: "Username taken or invalid", variant: "danger" });
    toast({ title: "Username updated", variant: "success" });
  }

  async function changePassword() {
    if (password.length < 8) return toast({ title: "Password must be 8+ characters", variant: "danger" });
    if (password !== confirm) return toast({ title: "Passwords do not match", variant: "danger" });
    setBusy(true);
    const res = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return toast({ title: data.error || "Failed to update", variant: "danger" });
    setPassword("");
    setConfirm("");
    toast({ title: "Password updated", variant: "success" });
  }

  async function copyRef() {
    if (!profile?.referral_code) return;
    try {
      await navigator.clipboard.writeText(profile.referral_code);
      toast({ title: "Referral code copied", variant: "success" });
    } catch {}
  }

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  if (!profile) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <p className="text-sm font-semibold">Profile</p>
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Button variant="outline" onClick={saveUsername}>Save username</Button>
          <div>
            <p className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">Referral code</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-xl border border-[var(--border)] bg-white/[0.03] px-3 py-2 text-sm">{profile.referral_code || "—"}</code>
              <Button size="sm" variant="outline" onClick={copyRef}>Copy</Button>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <p className="text-sm font-semibold">Appearance</p>
          <div className="flex gap-2">
            {THEMES.map((t) => (
              <button key={t.id} onClick={() => setTheme(t.id)} className={cn("flex flex-1 flex-col items-center gap-1.5 rounded-xl border p-3 transition-colors duration-200", theme === t.id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] hover:bg-white/[0.03]")}>
                <span className="h-6 w-6 rounded-full" style={{ background: t.hex }} />
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            ))}
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--text-muted)]">Color scheme</p>
            <ThemeModeToggle />
          </div>

          </div>
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
            <p className="text-sm font-medium">Reduce animations</p>
            <button onClick={() => setReduceMotion(!reduceMotion)} className={cn("relative h-6 w-11 rounded-full transition-colors duration-200", reduceMotion ? "bg-[var(--accent)]" : "bg-white/[0.12]")} aria-label="Toggle reduce animations">
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200", reduceMotion ? "translate-x-5" : "translate-x-0.5")} />
            </button>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-[var(--text-muted)]">Language</p>
            <LanguageSwitcher />
          </div>
        </Card>
      </div>

      <Card className="max-w-lg space-y-4">
        <p className="text-sm font-semibold">Change password</p>
        <Input label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <Button variant="outline" loading={busy} onClick={changePassword}>Update password</Button>
      </Card>

      <Card><NotificationsSection notifs={notifs} markRead={markRead} /></Card>
    </div>
  );
}
