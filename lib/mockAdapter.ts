import type { ProviderAdapter, ProviderConfig, ProviderServiceDto, AddOrderArgs } from "./providerAdapter";

// Mock adapter — used when a provider has no API key/URL (test/demo mode).
export class MockAdapter implements ProviderAdapter {
  readonly config: ProviderConfig;
  private counter = 1000;

  constructor(cfg: ProviderConfig) {
    this.config = cfg;
  }

  static SERVICES: ProviderServiceDto[] = [
    { provider_service_id: "mig-followers", name: "Instagram Followers | 100% Real (Non Drop)", rate: 0.003, min: 50, max: 50000, refill: true },
    { provider_service_id: "mig-likes", name: "Instagram Likes | High Quality - No Drop", rate: 0.0022, min: 50, max: 20000, refill: true },
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

  private async sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async getBalance() {
    return 850.5;
  }
  async getServices() {
    return MockAdapter.SERVICES;
  }
  async addOrder(_args: AddOrderArgs) {
    await this.sleep(300);
    this.counter += 1;
    return { orderId: `MOCK-${this.counter}` };
  }
  async getStatus(orderId: string) {
    const n = Math.abs(hash(orderId)) % 5;
    const statuses = ["Pending", "Processing", "In progress", "Completed", "Partial"];
    return { status: statuses[n] };
  }
  async refill() {
    return undefined;
  }
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h;
}
