// Mercury AI client (OpenAI-compatible chat completions) with safe fallback.

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function isMercuryConfigured(): boolean {
  return Boolean(process.env.MERCURY_BASE_URL && process.env.MERCURY_API_KEY && process.env.MERCURY_MODEL);
}

const TIMEOUT_MS = 15000;

export async function mercuryChat(
  messages: ChatMessage[],
  opts: { maxTokens?: number } = {}
): Promise<string | null> {
  if (!isMercuryConfigured()) return null;

  const base = process.env.MERCURY_BASE_URL!.replace(/\/$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MERCURY_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.MERCURY_MODEL,
        messages,
        max_tokens: opts.maxTokens ?? 150,
        temperature: 0.3,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch {
    clearTimeout(timer);
    return null; // safe fallback: panel keeps working
  }
}

// Heuristic service score (0-100). Used when Mercury is not configured.
export function heuristicServiceScore(providerRate: number, min: number, max: number): number {
  const priceScore = Math.max(0, 1 - Math.min(providerRate / 0.05, 1));
  const rangeScore = Math.min(1, Math.log10(Math.max(1, max - min)) / 5);
  return Math.round((priceScore * 0.7 + rangeScore * 0.3) * 100);
}
