import { maskResponse, logProviderCall } from "./providerLog";
import { MockAdapter } from "./mockAdapter";

// Pluggable provider adapter layer.
//
// A ProviderAdapter wraps a concrete upstream API. The default implementation
// (`SMMV2Adapter`) speaks the common SMM Panel v2 format (actions: balance,
// services, add, status, refill). It enforces:
//   - sane timeouts + standard headers
//   - per-provider concurrency caps (Semaphore)
//   - exponential backoff with jitter on 429/5xx/network errors
//   - full call logging (request/response masked, latency, status)
//
// To add a new provider format, implement ProviderAdapter and register it in
// `createAdapter`.

export type ProviderFormat = "smm_v2" | "mock";

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  format: ProviderFormat;
  concurrencyCap: number;
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
}

export interface ProviderServiceDto {
  provider_service_id: string;
  name: string;
  rate: number;
  min: number;
  max: number;
  refill?: boolean;
  cancel?: boolean;
}

export interface AddOrderArgs {
  service: string;
  link: string;
  quantity: number;
  runs?: number;
  interval?: number;
}
export interface AddOrderResult {
  orderId: string;
}
export interface OrderStatusResult {
  status: string;
}

export interface ProviderAdapter {
  readonly config: ProviderConfig;
  getBalance(): Promise<number>;
  getServices(): Promise<ProviderServiceDto[]>;
  addOrder(args: AddOrderArgs): Promise<AddOrderResult>;
  getStatus(orderId: string): Promise<OrderStatusResult>;
  refill(orderId: string): Promise<void>;
}

// In-process semaphore for per-provider concurrency caps.
export class Semaphore {
  private queue: (() => void)[] = [];
  private active = 0;
  constructor(private cap: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.cap) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.active++;
  }

  release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface HttpOptions {
  action: string;
  fields?: Record<string, string | number>;
  method?: "POST" | "GET";
}

// Low-level SMM v2 HTTP caller with retry/backoff/jitter + logging.
function createSmmHttp(cfg: ProviderConfig) {
  const retries = cfg.retries ?? 3;
  const backoffMs = cfg.backoffMs ?? 800;
  const timeoutMs = cfg.timeoutMs ?? 20000;

  return async function call(http: HttpOptions): Promise<any> {
    const started = Date.now();
    let lastErr: unknown = null;
    let lastStatus = 0;
    let lastResp: unknown = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const body = new URLSearchParams(
          { key: cfg.apiKey, action: http.action, ...Object.fromEntries(
              Object.entries(http.fields || {}).map(([k, v]) => [k, String(v)])
            ) }
        );
        const res = await fetch(cfg.baseUrl, {
          method: http.method || "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            "User-Agent": "Wazeo/1.0",
          },
          body: body.toString(),
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timer);
        lastStatus = res.status;

        if (!res.ok) {
          lastErr = new Error(`Provider HTTP ${res.status}`);
          if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            throw lastErr; // non-rate-limit 4xx: do not retry
          }
        } else {
          const data = await res.json();
          lastResp = data;
          if (data && data.status === "error") {
            lastErr = new Error(`Provider error: ${data.error || "unknown"}`);
            throw lastErr;
          }
          return data;
        }
      } catch (e) {
        clearTimeout(timer);
        lastErr = e;
        if (attempt < retries) {
          const jitter = 0.8 + Math.random() * 0.4;
          await sleep(backoffMs * Math.pow(2, attempt) * jitter);
        }
      }
    }

    await logProviderCall({
      provider_id: cfg.id,
      action: http.action,
      ok: false,
      http_status: lastStatus || null,
      retries,
      duration_ms: Date.now() - started,
      error: String(lastErr || "failed"),
      response_masked: lastResp != null ? maskResponse(lastResp) : null,
    });
    throw new Error(`Provider request failed after retries: ${String(lastErr)}`);
  };
}

export class SMMV2Adapter implements ProviderAdapter {
  readonly config: ProviderConfig;
  private sem: Semaphore;
  private http: ReturnType<typeof createSmmHttp>;

  constructor(cfg: ProviderConfig) {
    this.config = cfg;
    this.sem = new Semaphore(Math.max(1, cfg.concurrencyCap));
    this.http = createSmmHttp(cfg);
  }

  private async run<T>(
    action: string,
    fields: Record<string, string | number>,
    okCheck: (d: any) => T
  ): Promise<T> {
    await this.sem.acquire();
    const started = Date.now();
    try {
      const data = await this.http({ action, fields });
      const result = okCheck(data);
      await logProviderCall({
        provider_id: this.config.id,
        action,
        ok: true,
        duration_ms: Date.now() - started,
        response_masked: maskResponse(data),
      });
      return result;
    } catch (e) {
      await logProviderCall({
        provider_id: this.config.id,
        action,
        ok: false,
        duration_ms: Date.now() - started,
        error: String(e),
      });
      throw e;
    } finally {
      this.sem.release();
    }
  }

  async getBalance(): Promise<number> {
    return this.run("balance", {}, (d) => Number(d?.balance || d?.result?.balance || 0));
  }

  async getServices(): Promise<ProviderServiceDto[]> {
    const list = await this.run<any[]>("services", {}, (d) =>
      Array.isArray(d?.result) ? d.result : Array.isArray(d) ? d : []
    );
    return list
      .filter((s) => s && s.service != null)
      .map((s) => ({
        provider_service_id: String(s.service),
        name: String(s.name || "Service " + s.service),
        rate: Number(s.rate || 0),
        min: Number(s.min || 1),
        max: Number(s.max || 100000),
        refill: Boolean(s.refill),
        cancel: Boolean(s.cancel),
      }));
  }

  async addOrder(args: AddOrderArgs): Promise<AddOrderResult> {
    const data = await this.run<any>("add", {
      service: args.service,
      link: args.link,
      quantity: args.quantity,
      runs: args.runs ?? 1,
      interval: args.interval ?? 20,
    }, (d) => d);
    return { orderId: String(data?.order || data?.result?.order || "") };
  }

  async getStatus(orderId: string): Promise<OrderStatusResult> {
    const data = await this.run<any>("status", { order: orderId }, (d) => d);
    return { status: String(data?.status || data?.result?.status || "Pending") };
  }

  async refill(orderId: string): Promise<void> {
    await this.run<any>("refill", { order: orderId }, () => null);
  }
}

export function createAdapter(cfg: ProviderConfig): ProviderAdapter {
  if (cfg.format === "mock" || !cfg.apiKey || !cfg.baseUrl) {
    return new MockAdapter(cfg);
  }
  if (cfg.format === "smm_v2") {
    return new SMMV2Adapter(cfg);
  }
  throw new Error(`Unsupported provider format: ${cfg.format}`);
}

