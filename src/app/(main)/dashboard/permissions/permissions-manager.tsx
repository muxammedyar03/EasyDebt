"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, Loader2, Search, ShieldCheck } from "lucide-react";
import { effectivePermission, PERMISSION_GROUPS, type PermissionKey } from "@/lib/security/permission-catalog";

type Override = { key: string; enabled: boolean; user_id?: number };
type Shop = { id: number; name: string; slug: string; is_active: boolean };
type Staff = {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
};
type Data = {
  clients: Shop[];
  users: Staff[];
  selectedClientId: number;
  platform: Override[];
  client: Override[];
  user: Override[];
  canManage: boolean;
  canManageClient: boolean;
};
type Scope = "platform" | "client" | "user";
type CatalogPage = (typeof PERMISSION_GROUPS)[number]["pages"][number];
const allPages = PERMISSION_GROUPS.flatMap<CatalogPage>((group) => group.pages);

export function PermissionsManager({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [data, setData] = useState<Data | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [pageKey, setPageKey] = useState<string>(allPages[0].key);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    const url = clientId ? `/api/permissions?clientId=${clientId}` : "/api/permissions";
    fetch(url, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Ruxsatlarni yuklab bo‘lmadi");
        return response.json() as Promise<Data>;
      })
      .then((result) => {
        if (active) {
          setData(result);
          setError("");
        }
      })
      .catch((cause) => {
        if (active) setError(String(cause));
      });
    return () => {
      active = false;
    };
  }, [clientId, revision]);

  const scope: Scope = userId != null ? "user" : clientId != null || !isSuperAdmin ? "client" : "platform";
  const selectedUser = data?.users.find((user) => user.id === userId);
  const selectedShop = data?.clients.find((client) => client.id === data.selectedClientId);
  const platformMap = useMemo(() => new Map(data?.platform.map((item) => [item.key, item.enabled])), [data]);
  const clientMap = useMemo(() => new Map(data?.client.map((item) => [item.key, item.enabled])), [data]);
  const userMap = useMemo(
    () => new Map(data?.user.filter((item) => item.user_id === userId).map((item) => [item.key, item.enabled])),
    [data, userId],
  );
  const current = useCallback(
    (key: PermissionKey) => {
      if (scope === "platform") return platformMap.get(key) ?? true;
      if (scope === "client") return platformMap.get(key) !== false && (clientMap.get(key) ?? true);
      return effectivePermission(
        selectedUser?.role ?? "USER",
        key,
        platformMap.get(key),
        clientMap.get(key),
        userMap.get(key),
      );
    },
    [scope, platformMap, clientMap, userMap, selectedUser],
  );
  const editable = Boolean(data?.canManage && (scope === "user" || isSuperAdmin));
  const parentAllows = (key: PermissionKey) =>
    scope === "platform" ||
    (platformMap.get(key) !== false &&
      (scope === "client" || clientMap.get(key) !== false) &&
      !(
        scope === "user" &&
        selectedUser?.role === "USER" &&
        (key.startsWith("users.") ||
          key.startsWith("permissions.") ||
          ["clients.view", "clients.manage", "tenant.backup", "company-receipts.view"].includes(key))
      ));
  const editableKey = (key: PermissionKey) =>
    editable &&
    parentAllows(key) &&
    !(scope === "platform" && ["permissions.view", "permissions.manage", "clients.view"].includes(key));

  const save = async (changes: { key: string; enabled: boolean }[]) => {
    if (!editable || busy || !changes.length || !data) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, clientId: data.selectedClientId, userId: userId ?? undefined, changes }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Saqlashda xatolik");
      }
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Saqlashda xatolik");
    } finally {
      setBusy(false);
    }
  };

  function switchShop(id: number) {
    setClientId(id);
    setUserId(null);
    setPageKey(allPages[0].key);
    setQuery("");
  }
  const selectedPage = allPages.find((page) => page.key === pageKey) ?? allPages[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {clientId != null && isSuperAdmin && (
          <button
            type="button"
            className="rounded-lg border p-2"
            onClick={() => {
              setClientId(null);
              setUserId(null);
            }}
          >
            <ChevronLeft className="size-4" aria-label="Magazinlar" />
          </button>
        )}
        {userId != null && (
          <button type="button" className="rounded-lg border p-2" onClick={() => setUserId(null)}>
            <ChevronLeft className="size-4" aria-label="Magazinga qaytish" />
          </button>
        )}
        <ShieldCheck className="text-primary size-6" />
        <div>
          <h1 className="text-2xl font-semibold">Ruxsatlar</h1>
          <p className="text-muted-foreground text-sm">
            {selectedUser ? selectedUser.username : scope === "client" ? selectedShop?.name : "Platforma va magazinlar"}
          </p>
        </div>
        {busy && <Loader2 className="ml-auto size-5 animate-spin" aria-label="Saqlanmoqda" />}
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-red-400 p-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {!data ? (
        <p>Yuklanmoqda...</p>
      ) : (
        <>
          {scope === "platform" && (
            <section className="space-y-4">
              <h2 className="font-semibold">Magazinlar</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.clients.map((shop) => (
                  <button
                    key={shop.id}
                    type="button"
                    onClick={() => switchShop(shop.id)}
                    className="flex items-center justify-between rounded-xl border p-5 text-left hover:border-blue-500"
                  >
                    <span>
                      <strong className="block">{shop.name}</strong>
                      <small className="text-muted-foreground">{shop.slug}</small>
                    </span>
                    <ChevronRight className="size-5" />
                  </button>
                ))}
              </div>
              <h2 className="font-semibold">Platforma → magazinlar</h2>
              <p className="text-muted-foreground text-sm">Bu cheklovlar barcha magazinlarga ta’sir qiladi.</p>
              <CheckGroup
                title="Umumiy sahifa va amallar"
                items={allPages.flatMap((p) => [
                  { key: p.key, label: p.label },
                  ...p.actions.map((a) => ({ key: a.key, label: `${p.label} · ${a.label}` })),
                ])}
                value={current}
                disabled={(key) => !editableKey(key)}
                onSave={save}
              />
            </section>
          )}
          {scope === "client" && (
            <>
              <section className="space-y-3">
                <h2 className="font-semibold">Magazin xodimlari</h2>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {data.users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setUserId(user.id);
                        setPageKey(allPages[0].key);
                      }}
                      className="flex items-center justify-between rounded-lg border p-3 text-left hover:border-blue-500"
                    >
                      <span>
                        <strong className="block">
                          {[user.first_name, user.last_name].filter(Boolean).join(" ") || user.username}
                        </strong>
                        <small className="text-muted-foreground">
                          {user.username} · {user.role}
                        </small>
                      </span>
                      <ChevronRight className="size-4" />
                    </button>
                  ))}
                </div>
              </section>
              <CheckGroup
                title="Magazin sahifalari"
                items={allPages.map((p) => ({ key: p.key, label: p.label }))}
                value={current}
                disabled={(key) => !editableKey(key)}
                onSave={save}
              />
            </>
          )}
          {scope === "user" && (
            <CheckGroup
              title="Xodim kirishi mumkin bo‘lgan sahifalar"
              items={allPages.map((p) => ({ key: p.key, label: p.label }))}
              value={current}
              disabled={(key) => !editableKey(key)}
              onSave={save}
            />
          )}
          {scope !== "platform" && (
            <section className="overflow-hidden rounded-xl border">
              <div className="bg-muted/40 border-b px-4 py-3 font-semibold">Sahifalardagi funksiyalar</div>
              <div className="grid min-h-96 md:grid-cols-[15rem_1fr]">
                <nav className="border-b p-3 md:border-r md:border-b-0" aria-label="Permission sahifalari">
                  <label className="mb-3 flex items-center gap-2 rounded-lg border px-2">
                    <Search className="size-4" />
                    <input
                      className="w-full bg-transparent py-2 outline-none"
                      placeholder="Sahifani qidirish"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </label>
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.label} className="mb-4">
                      <p className="text-muted-foreground px-2 py-1 text-xs font-semibold uppercase">{group.label}</p>
                      {group.pages
                        .filter((page) => page.label.toLowerCase().includes(query.toLowerCase()))
                        .map((page) => (
                          <button
                            type="button"
                            key={page.key}
                            onClick={() => setPageKey(page.key)}
                            className={`flex w-full justify-between rounded-lg px-2 py-2 text-left text-sm ${pageKey === page.key ? "bg-blue-600 text-white" : "hover:bg-muted"}`}
                          >
                            <span>{page.label}</span>
                            <span>
                              {page.actions.filter((a) => current(a.key)).length}/{page.actions.length}
                            </span>
                          </button>
                        ))}
                    </div>
                  ))}
                </nav>
                <div className="p-4">
                  <h3 className="mb-3 font-semibold">{selectedPage.label}</h3>
                  {selectedPage.actions.length ? (
                    <CheckGroup
                      title="Amallar"
                      items={selectedPage.actions}
                      value={current}
                      disabled={(key) => !editableKey(key) || !current(selectedPage.key)}
                      onSave={save}
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">Bu sahifa uchun qo‘shimcha amal yo‘q.</p>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function CheckGroup({
  title,
  items,
  value,
  disabled,
  onSave,
}: {
  title: string;
  items: readonly { key: PermissionKey; label: string }[];
  value: (key: PermissionKey) => boolean;
  disabled: (key: PermissionKey) => boolean;
  onSave: (changes: { key: string; enabled: boolean }[]) => void;
}) {
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState(false);
  const visible = items.filter((item) =>
    `${item.label} ${item.key}`.toLocaleLowerCase().includes(filter.toLocaleLowerCase()),
  );
  const selected = visible.filter((item) => value(item.key)).length;
  const toggleAll = (enabled: boolean) =>
    onSave(
      visible
        .filter((item) => !disabled(item.key) && value(item.key) !== enabled)
        .map((item) => ({ key: item.key, enabled })),
    );
  return (
    <div className="rounded-xl border">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <strong className="mr-auto">{title}</strong>
        <label className="flex items-center gap-2 rounded-lg border px-2">
          <Search className="size-4" />
          <input
            aria-label={`${title} qidiruv`}
            className="max-w-36 bg-transparent py-1 outline-none"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Qidirish"
          />
        </label>
        <span className="text-muted-foreground text-xs">
          {selected}/{visible.length}
        </span>
        <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => toggleAll(false)}>
          Tozalash
        </button>
        <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => toggleAll(true)}>
          Barchasi
        </button>
        <button
          type="button"
          className="rounded border p-1"
          onClick={() => setExpanded(!expanded)}
          aria-label="Kengaytirish"
        >
          <Expand className="size-4" />
        </button>
      </div>
      <div className={`grid gap-1 overflow-auto p-3 sm:grid-cols-2 ${expanded ? "max-h-[80vh]" : "max-h-64"}`}>
        {visible.map((item) => (
          <label
            key={item.key}
            className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-950"
          >
            <input
              type="checkbox"
              className="size-4 accent-blue-600"
              checked={value(item.key)}
              disabled={disabled(item.key)}
              onChange={(event) => onSave([{ key: item.key, enabled: event.target.checked }])}
            />
            <span>{item.label}</span>
          </label>
        ))}
        {!visible.length && <p className="text-muted-foreground py-4 text-sm">Natija topilmadi.</p>}
      </div>
    </div>
  );
}
