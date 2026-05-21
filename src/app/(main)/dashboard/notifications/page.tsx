import { Suspense } from "react";
import { headers as getHeaders, cookies as getCookies } from "next/headers";
import { format } from "date-fns";
import { uz } from "date-fns/locale";
import NotificationsClient from "./_components/notifications-client";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({ searchParams }: { searchParams?: Promise<Record<string, string>> }) {
  const params = (await searchParams) ?? {};
  const page = Math.max(parseInt(params.page ?? "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(params.pageSize ?? "10", 10) || 10, 1), 50);
  const q = params.q?.trim() ?? "";
  const type = params.type?.trim();
  const readParam = params.read?.trim();

  const search = new URLSearchParams();
  search.set("page", String(page));
  search.set("pageSize", String(pageSize));
  if (q) search.set("q", q);
  if (type) search.set("type", type);
  if (readParam === "true" || readParam === "false") search.set("read", readParam);

  const hdrs = await getHeaders();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  const cookieHeader = (await getCookies()).toString();
  const res = await fetch(`${baseUrl}/api/notifications?${search.toString()}`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  if (!res.ok) {
    throw new Error("Failed to load notifications");
  }
  const data = (await res.json()) as {
    notifications: Array<{
      id: number;
      user_id: number | null;
      debtor_id: number | null;
      type: string;
      title: string;
      message: string;
      is_read: boolean;
      created_at: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
  };

  const serialized = data.notifications.map((n) => {
    const createdAt = new Date(n.created_at);
    return {
      ...n,
      created_at: createdAt.toISOString(),
      created_at_text: format(createdAt, "yyyy-MM-dd HH:mm", { locale: uz }),
    };
  });

  return (
    <Suspense>
      <NotificationsClient
        items={serialized}
        total={data.total}
        page={page}
        pageSize={pageSize}
        query={q}
        type={type}
        read={readParam}
      />
    </Suspense>
  );
}
