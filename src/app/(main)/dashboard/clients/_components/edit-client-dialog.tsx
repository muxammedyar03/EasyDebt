"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import type { ClientRow } from "./clients-list";

type EditClientDialogProps = {
  client: ClientRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditClientDialog({ client, open, onOpenChange }: EditClientDialogProps) {
  const t = useTranslations("clients");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (client && open) {
      setName(client.name);
      setIsActive(client.is_active);
    }
  }, [client, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    if (name.trim().length < 2) {
      toast.error(t("nameMin"));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), is_active: isActive }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t("updateError"));
      }
      toast.success(t("updateSuccess"));
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("updateError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
          <DialogDescription>{t("editDescription")}</DialogDescription>
        </DialogHeader>
        {client && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-client-name">{t("name")}</Label>
              <Input
                id="edit-client-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-client-slug">{t("slug")}</Label>
              <Input id="edit-client-slug" value={client.slug} disabled className="bg-muted" />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="edit-client-active">{t("status")}</Label>
                <p className="text-muted-foreground text-sm">{isActive ? t("active") : t("inactive")}</p>
              </div>
              <Switch id="edit-client-active" checked={isActive} onCheckedChange={setIsActive} disabled={isLoading} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("editSubmit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
