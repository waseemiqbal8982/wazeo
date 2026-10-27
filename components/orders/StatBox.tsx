export function Stats({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-3">
      <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
