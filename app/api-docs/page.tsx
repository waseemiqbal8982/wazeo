import { PublicShell } from "@/components/public/PublicShell";

export const metadata = { title: "API Documentation" };

export default function ApiDocsPage() {
  return (
    <PublicShell title="API Documentation" subtitle="Integrate with the Wazeo API (v2).">
      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold">Authentication</h2>
          <p className="mt-2 text-[var(--text-muted)]">
            All API requests require an API key. Pass it in the <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs">Authorization: Bearer &lt;key&gt;</code> header.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Place an order</h2>
          <p className="mt-2 text-[var(--text-muted)]">Create a new order with gradual delivery.</p>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)] bg-black/40 p-4 font-mono text-xs text-emerald-300">
{`POST /api/v2/orders
{
  "service_id": "…",
  "link": "https://instagram.com/username",
  "quantity": 1000,
  "duration_minutes": 360,
  "curve": "steady",
  "variation_percent": 10
}`}
          </pre>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Check order status</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)] bg-black/40 p-4 font-mono text-xs text-emerald-300">
{`GET /api/v2/orders/{id}`}
          </pre>
        </section>
        <section>
          <h2 className="text-lg font-semibold">List services</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)] bg-black/40 p-4 font-mono text-xs text-emerald-300">
{`GET /api/v2/services?platform=instagram`}
          </pre>
          <p className="mt-3 text-[var(--text-muted)]">
            Data is returned in USD; convert to the display currency on the client side.
          </p>
        </section>
      </div>
    </PublicShell>
  );
}
