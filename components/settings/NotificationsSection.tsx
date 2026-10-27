"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function NotificationsSection({ notifs, markRead }: { notifs: any[]; markRead: (id: string) => void }) {
  const unread = notifs.filter((n) => !n.read).length;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Notifications</p>
        {unread > 0 && <Badge tone="accent">{unread} new</Badge>}
      </div>
      {notifs.length === 0 ? (
        <EmptyState title="No notifications" />
      ) : (
        <ul className="space-y-2">
          {notifs.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-white/[0.02] p-3">
              <div>
                <p className={cn("text-sm", !n.read && "font-medium")}>{n.message}</p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">{formatDateTime(n.created_at)}</p>
              </div>
              {!n.read && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Mark read</Button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
