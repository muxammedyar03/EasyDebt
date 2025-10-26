"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

type Item = {
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
  items: Item[];
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

  const [search, setSearch] = React.useState<string>(query ?? "");
  const [loadingId, setLoadingId] = React.useState<number | null>(null);
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

  async function markAsRead(id: number) {
    setLoadingId(id);
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      updateParams({});
    } finally {
      setLoadingId(null);
    }
  }

  async function markAllAsRead() {
    await fetch(`/api/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    });
    updateParams({});
  }

  return (
    <Card className="space-y-4 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[240px] flex-1">
          <Input
            placeholder="Qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParams({ q: search, page: "1" });
            }}
          />
        </div>
        <Select
          value={type ?? "__ALL__"}
          onValueChange={(v) => updateParams({ type: v === "__ALL__" ? undefined : v, page: "1" })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Turi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">Hammasi</SelectItem>
            <SelectItem value="OVERDUE_PAYMENT">Muddati o&apos;tgan</SelectItem>
            <SelectItem value="DEBT_LIMIT_EXCEEDED">Limitdan oshdi</SelectItem>
            <SelectItem value="HOSTING_REMINDER">Hosting eslatma</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={read ?? "__ALL__"}
          onValueChange={(v) => updateParams({ read: v === "__ALL__" ? undefined : v, page: "1" })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Holati" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">Hammasi</SelectItem>
            <SelectItem value="false">O&apos;qilmagan</SelectItem>
            <SelectItem value="true">O&apos;qilgan</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={() => updateParams({ q: search, page: "1" })}>
          Qidirish
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => updateParams({ q: undefined, type: undefined, read: undefined, page: "1" })}
          >
            Tozalash
          </Button>
          <Button onClick={markAllAsRead}>Barchasini o&apos;qildi</Button>
        </div>
      </div>

      <div className="divide-y rounded-md border">
        {items.length === 0 ? (
          <div className="text-muted-foreground p-6 text-center text-sm">Bildirishnomalar topilmadi</div>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className="hover:bg-muted/50 flex flex-col gap-3 border-b p-4 transition-colors sm:flex-row sm:items-center"
            >
              {/* Status */}
              <div className="w-full flex-shrink-0 sm:w-24">
                {!n.is_read ? (
                  <Badge variant="default" className="bg-blue-500">
                    Yangi
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    O&apos;qildi
                  </Badge>
                )}
              </div>

              {/* Title va Sana */}
              <div className="min-w-0 flex-1">
                <div
                  className={`truncate text-sm font-medium sm:text-base ${n.is_read ? "text-muted-foreground" : ""}`}
                >
                  {n.title}
                </div>
                <div className={`mt-0.5 text-xs ${n.is_read ? "text-muted-foreground" : ""}`}>{n.created_at_text}</div>
              </div>

              {/* Message */}
              <div className="min-w-0 flex-1 sm:flex-[2]">
                <div className={`line-clamp-2 text-base font-medium ${n.is_read ? "text-muted-foreground" : ""}`}>
                  {n.message}
                </div>
              </div>

              {/* Action Button */}
              <div className="w-full flex-shrink-0 sm:w-auto">
                {!n.is_read ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full bg-blue-400 font-medium text-white hover:bg-blue-500 hover:text-white sm:w-auto"
                    onClick={() => markAsRead(n.id)}
                    disabled={loadingId === n.id}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    O&apos;qilgan deb belgilash
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled className="w-full sm:w-auto">
                    O&apos;qildi
                  </Button>
                )}
              </div>
            </div>
          ))
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
