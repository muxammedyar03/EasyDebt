"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Ban, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function UndoAuditButton({
  id,
  kind = "undo",
  iconOnly = false,
}: {
  id: number;
  kind?: "undo" | "cancel";
  iconOnly?: boolean;
}) {
  const t = useTranslations("audit");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  async function submit() {
    if (kind === "undo" && !window.confirm(t("undoConfirm"))) return;
    setPending(true);
    try {
      const response = await fetch(`/api/audit-logs/${id}/${kind}`, {
        method: "POST",
        ...(kind === "cancel"
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }
          : {}),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || (kind === "cancel" ? t("cancelFailed") : t("undoFailed")));
      toast.success(kind === "cancel" ? t("cancelSuccess") : t("undoSuccess"));
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : kind === "cancel" ? t("cancelFailed") : t("undoFailed"));
    } finally {
      setPending(false);
    }
  }
  const title = kind === "cancel" ? t("cancel") : t("undo");
  return (
    <>
      <Button
        type="button"
        size={iconOnly ? "icon" : "sm"}
        variant={iconOnly ? "ghost" : "outline"}
        className={iconOnly ? "text-foreground hover:text-primary size-9" : undefined}
        disabled={pending}
        title={title}
        aria-label={title}
        onClick={() => (kind === "cancel" ? setOpen(true) : void submit())}
      >
        {kind === "cancel" ? <Ban className="size-5" /> : <RotateCcw className="size-5" />}
        {!iconOnly && <span className="ml-1">{title}</span>}
      </Button>
      {kind === "cancel" && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("cancel")}</DialogTitle>
              <DialogDescription>{t("cancelConfirm")}</DialogDescription>
            </DialogHeader>
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={200}
              placeholder={t("cancelReason")}
              aria-label={t("cancelReason")}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                {t("close")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => void submit()}
                disabled={pending || reason.trim().length < 3}
              >
                {t("cancel")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
