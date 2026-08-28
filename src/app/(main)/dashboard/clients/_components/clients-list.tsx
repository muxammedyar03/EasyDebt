"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { EditClientDialog } from "./edit-client-dialog";

export type ClientRow = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  users_count: number;
  debtors_count: number;
};

type ClientsListProps = {
  clients: ClientRow[];
  currentClientId: number;
};

export function ClientsList({ clients, currentClientId }: ClientsListProps) {
  const t = useTranslations("clients");
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<number | null>(null);
  const [editingClient, setEditingClient] = React.useState<ClientRow | null>(null);

  const toggleActive = async (client: ClientRow) => {
    setPendingId(client.id);
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !client.is_active }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t("updateError"));
      }
      toast.success(client.is_active ? t("deactivated") : t("activated"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("updateError"));
    } finally {
      setPendingId(null);
    }
  };

  const switchTo = async (client: ClientRow) => {
    if (client.id === currentClientId) return;
    setPendingId(client.id);
    try {
      const response = await fetch("/api/auth/change-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t("switchError"));
      }
      toast.success(t("switchSuccess", { name: client.name }));
      window.location.assign("/dashboard/default");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("switchError"));
      setPendingId(null);
    }
  };

  if (clients.length === 0) {
    return <p className="text-muted-foreground p-6 text-sm">{t("empty")}</p>;
  }

  return (
    <>
      <EditClientDialog
        client={editingClient}
        open={editingClient !== null}
        onOpenChange={(open) => {
          if (!open) setEditingClient(null);
        }}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("name")}</TableHead>
            <TableHead>{t("slug")}</TableHead>
            <TableHead>{t("usersCount")}</TableHead>
            <TableHead>{t("debtorsCount")}</TableHead>
            <TableHead>{t("status")}</TableHead>
            <TableHead>{t("created")}</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id} data-state={client.id === currentClientId ? "selected" : undefined}>
              <TableCell className="font-medium">
                {client.name}
                {client.id === currentClientId && (
                  <Badge variant="secondary" className="ml-2">
                    {t("current")}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{client.slug}</TableCell>
              <TableCell>{client.users_count}</TableCell>
              <TableCell>{client.debtors_count}</TableCell>
              <TableCell>
                <Badge variant={client.is_active ? "default" : "outline"}>
                  {client.is_active ? t("active") : t("inactive")}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(client.created_at).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={pendingId === client.id}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingClient(client)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      {t("edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => switchTo(client)} disabled={client.id === currentClientId}>
                      {t("enterStore")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleActive(client)}>
                      {client.is_active ? t("deactivate") : t("activate")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
