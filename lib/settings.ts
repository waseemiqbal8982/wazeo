import { createAdminClient } from "./supabase/admin";

// Small typed helpers for the `settings` key/value table (server-side only).

export async function getSetting(key: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return data?.value == null ? null : String(data.value);
  } catch {
    return null;
  }
}

export async function getSettingInt(key: string, fallback = 0): Promise<number> {
  const v = await getSetting(key);
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function getSettingJson<T>(key: string, fallback: T): Promise<T> {
  const v = await getSetting(key);
  if (!v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}
