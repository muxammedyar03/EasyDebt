"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function UndoAuditButton({ id }: { id: number }) {
  const t = useTranslations("audit");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function undo() {
    if (!window.confirm(t("undoConfirm"))) return;
    setPending(true);
    try {
      const response = await fetch(`/api/audit-logs/${id}/undo`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t("undoFailed"));
      toast.success(t("undoSuccess"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("undoFailed"));
    } finally {
      setPending(false);
    }
  }
  return <Button size="sm" variant="outline" disabled={pending} onClick={undo}>{t("undo")}</Button>;
}
