// Pure smart-router selection logic (no framework deps) so it can be reused by
// both the app and the integration test suite.

export function clamp01(n) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function clamp10(n) {
  return n < 0 ? 0 : n > 10 ? 10 : n;
}

// Filter to eligible providers and rank best-first.
// Hard rule: a provider whose balance < requiredCost is NEVER returned.
export function rankProviders(providers, requiredCost) {
  const cost = Math.max(0, Number(requiredCost) || 0);

  const candidates = (providers || []).filter((p) => {
    const balance = Number(p.balance) || 0;
    return (
      p.active !== false &&
      p.status === "active" &&
      !p.balance_stale &&
      balance >= cost
    );
  });

  if (candidates.length === 0) return [];

  const maxCost = Math.max(...candidates.map((p) => Number(p.balance) || 0));

  const scored = candidates.map((p) => {
    const balance = Number(p.balance) || 0;
    const errorRate = clamp01(Number(p.error_rate) || 0);
    const quality = clamp10(Number(p.quality_score) || 5);
    const normCost = maxCost > 0 ? Math.min(1, balance / maxCost) : 1;
    const headroom = cost > 0 ? Math.min(1, Math.max(0, (balance - cost) / cost)) : 1;
    const score =
      0.35 * normCost +
      0.25 * (1 - errorRate) +
      0.2 * headroom +
      0.2 * (quality / 10);
    return { provider: p, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const pa = Number(a.provider.priority) || 0;
    const pb = Number(b.provider.priority) || 0;
    if (pa !== pb) return pa - pb; // lower priority number wins tie
    return (Number(b.provider.weight) || 1) - (Number(a.provider.weight) || 1);
  });

  return scored.map((s) => s.provider);
}
