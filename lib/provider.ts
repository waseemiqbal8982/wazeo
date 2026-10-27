// Standard SMM Panel API v2 adapter with mock mode fallback.

type RetryConfig = { retries: number; backoffMs: number; timeoutMs: number };

export interface ProviderService {
  provider_service_id: string;
  name: string;
  rate: number; // provider price (per 1 unit)
  min: number;
  max: number;
}

export interface ProviderAddResult {
  orderId: string;
}

const DEFAULT_CONFIG: RetryConfig = {
  retries: 3,
  backoffMs: 800,
  timeoutMs: 20000,
};

function isConfigured(): boolean {
  return Boolean(process.env.PROVIDER_API_URL && process.env.PROVIDER_API_KEY);
}

export function isMockMode(): boolean {
  return !isConfigured();
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function post(
  action: string,
  fields: Record<string, string | number>
): Promise<any> {
  const url = process.env.PROVIDER_API_URL!;
  const key = process.env.PROVIDER_API_KEY!;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= DEFAULT_CONFIG.retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_CONFIG.timeoutMs);
    try {
      const body = new URLSearchParams({ key, action, ...Object.fromEntries(
        Object.entries(fields).map(([k, v]) => [k, String(v)])
      ) });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`Provider HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data && data.status === "error") {
        throw new Error(`Provider error: ${data.error || "unknown"}`);
      }
      return data;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt < DEFAULT_CONFIG.retries) {
        await sleep(DEFAULT_CONFIG.backoffMs * Math.pow(2, attempt));
      }
    }
  }
  throw new Error(`Provider request failed after retries: ${String(lastErr)}`);
}

// ---------- Mock data ----------
const MOCK_POOL: ProviderService[] = [
  { provider_service_id: "mig-followers", name: "Instagram Followers | 100% Real (Non Drop)", rate: 0.003, min: 50, max: 50000 },
  { provider_service_id: "mig-likes", name: "Instagram Likes | High Quality - No Drop", rate: 0.0022, min: 50, max: 20000 },
  { provider_service_id: "mig-views", name: "Instagram Video Views | Instant", rate: 0.0008, min: 100, max: 100000 },
  { provider_service_id: "mig-comments", name: "Instagram Comments | Custom", rate: 0.008, min: 10, max: 2000 },
  { provider_service_id: "mig-reels", name: "Instagram Reels Views | High Retention", rate: 0.0012, min: 100, max: 50000 },
  { provider_service_id: "mtt-followers", name: "TikTok Followers | Real Active", rate: 0.004, min: 30, max: 30000 },
  { provider_service_id: "mtt-likes", name: "TikTok Likes | No Drop", rate: 0.0018, min: 50, max: 20000 },
  { provider_service_id: "mtt-views", name: "TikTok Views | Instant", rate: 0.0006, min: 100, max: 200000 },
  { provider_service_id: "mtt-shares", name: "TikTok Shares | Real", rate: 0.005, min: 20, max: 5000 },
  { provider_service_id: "myt-subscribers", name: "YouTube Subscribers | Slow Start", rate: 0.028, min: 20, max: 10000 },
  { provider_service_id: "myt-views", name: "YouTube Views | High Quality", rate: 0.0025, min: 100, max: 100000 },
  { provider_service_id: "myt-likes", name: "YouTube Likes | 100% Real", rate: 0.009, min: 20, max: 10000 },
  { provider_service_id: "myt-watch", name: "YouTube Watch Hours | Real", rate: 0.015, min: 10, max: 5000 },
  { provider_service_id: "myt-comments", name: "YouTube Comments | Custom Text", rate: 0.012, min: 10, max: 3000 },
];

function mockGetServices(): ProviderService[] {
  return MOCK_POOL;
}

let mockCounter = 1000;

// ---------- Public API ----------
export async function providerGetServices(): Promise<ProviderService[]> {
  if (isMockMode()) return mockGetServices();
  const data = await post("services", {});
  const list: any[] = Array.isArray(data?.result) ? data.result : Array.isArray(data) ? data : [];
  return list
    .filter((s) => s && s.service != null)
    .map((s) => ({
      provider_service_id: String(s.service),
      name: String(s.name || "Service " + s.service),
      rate: Number(s.rate || 0),
      min: Number(s.min || 1),
      max: Number(s.max || 100000),
    }));
}

export async function providerAddOrder(args: {
  service: string;
  link: string;
  quantity: number;
  runs?: number;
  interval?: number;
}): Promise<ProviderAddResult> {
  if (isMockMode()) {
    mockCounter += 1;
    await sleep(300);
    return { orderId: `MOCK-${mockCounter}` };
  }
  const data = await post("add", {
    service: args.service,
    link: args.link,
    quantity: args.quantity,
    runs: args.runs ?? 1,
    interval: args.interval ?? 20,
  });
  return { orderId: String(data?.order || data?.result?.order || "") };
}

export async function providerGetStatus(orderId: string): Promise<{ status: string }> {
  if (isMockMode()) {
    const n = Math.abs(hash(orderId)) % 5;
    const statuses = ["Pending", "Processing", "In progress", "Completed", "Partial"];
    return { status: statuses[n] };
  }
  const data = await post("status", { order: orderId });
  const s = String(data?.status || data?.result?.status || "Pending");
  return { status: s };
}

export async function providerGetBalance(): Promise<number> {
  if (isMockMode()) return 850.5;
  const data = await post("balance", {});
  return Number(data?.balance || data?.result?.balance || 0);
}

export async function providerRefill(orderId: string): Promise<void> {
  if (isMockMode()) return;
  await post("refill", { order: orderId });
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h;
}
