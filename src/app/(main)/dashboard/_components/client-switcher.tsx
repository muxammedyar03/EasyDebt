"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ClientOption = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
};

type ClientSwitcherProps = {
  role: string;
  currentClient: ClientOption | null;
  clients: ClientOption[];
  className?: string;
};

export function ClientSwitcher({ role, currentClient, clients, className }: ClientSwitcherProps) {
  const t = useTranslations("clients");
  const router = useRouter();
  const [switching, setSwitching] = React.useState(false);
  const isSuperAdmin = role === "SUPER_ADMIN";

  if (!currentClient && !isSuperAdmin) {
    return null;
  }

  if (!isSuperAdmin) {
    return (
      <div
        className={cn(
          "border-border bg-muted/40 flex h-9 max-w-[200px] items-center gap-2 rounded-md border px-3 text-sm",
          className,
        )}
        title={currentClient?.name}
      >
        <Store className="text-muted-foreground h-4 w-4 shrink-0" />
        <span className="truncate font-medium">{currentClient?.name}</span>
      </div>
    );
  }

  const handleChange = async (value: string) => {
    const nextId = Number(value);
    if (!Number.isInteger(nextId) || nextId === currentClient?.id) return;

    setSwitching(true);
    try {
      const response = await fetch("/api/auth/change-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: nextId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t("switchError"));
      }
      if (data.warning) {
        toast.warning(data.warning);
      } else {
        toast.success(t("switchSuccess", { name: data.client?.name ?? "" }));
      }
      router.refresh();
      window.location.assign("/dashboard/default");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("switchError"));
      setSwitching(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select
        value={currentClient ? String(currentClient.id) : undefined}
        onValueChange={handleChange}
        disabled={switching || clients.length === 0}
      >
        <SelectTrigger className="h-9 w-[180px] sm:w-[220px]">
          {switching ? (
            <span className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("switching")}
            </span>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Store className="h-4 w-4 shrink-0" />
              <SelectValue placeholder={t("selectPlaceholder")} />
            </div>
          )}
        </SelectTrigger>
        <SelectContent>
          {clients.map((client) => (
            <SelectItem key={client.id} value={String(client.id)}>
              <span className="flex items-center gap-2">
                <span className="truncate">{client.name}</span>
                {!client.is_active && <span className="text-muted-foreground text-xs">({t("inactive")})</span>}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
