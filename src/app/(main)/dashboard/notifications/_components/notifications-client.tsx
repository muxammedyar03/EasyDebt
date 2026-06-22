"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NotificationsHeader } from "./notifications-header";
import { NotificationsFilters } from "./notifications-filters";
import { NotificationCardMobile } from "./notification-card-mobile";
import { NotificationCardDesktop } from "./notification-card-desktop";
import { useIsMobile } from "@/hooks/use-mobile";

export type NotificationItem = {
  id: number;
  user_id: number | null;
  debtor_id: number | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  created_at_text: string;
};

interface Props {
  items: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  type?: string;
  read?: string;
}

export default function NotificationsClient({ items, total, page, pageSize, query, type, read }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const [search, setSearch] = React.useState<string>(query ?? "");
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  const updateParams = React.useCallback(
    (patch: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams?.toString());
      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined || v === "") params.delete(k);
        else params.set(k, v);
      });
      router.push(`/dashboard/notifications?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <Card className="space-y-4 p-6">
      <NotificationsHeader updateParams={updateParams} />
      <NotificationsFilters
        search={search}
        setSearch={setSearch}
        updateParams={updateParams}
        type={type ?? ""}
        read={read ?? ""}
      />

      <div className="divide-y rounded-md border">
        {items.length === 0 ? (
          <div className="text-muted-foreground p-6 text-center text-sm">Bildirishnomalar topilmadi</div>
        ) : (
          items.map((n) =>
            isMobile ? (
              <NotificationCardMobile key={n.id} n={n} updateParams={updateParams} />
            ) : (
              <NotificationCardDesktop key={n.id} n={n} updateParams={updateParams} />
            ),
          )
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">Jami: {total}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) })}>
            Oldingi
          </Button>
          <span className="text-sm">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => updateParams({ page: String(page + 1) })}
          >
            Keyingi
          </Button>
        </div>
      </div>
    </Card>
  );
}
