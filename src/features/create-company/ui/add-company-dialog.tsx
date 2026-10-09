"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import * as z from "zod";

import { getErrorMessage } from "@/lib/errors";
import { formatUzPhone } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCompany, updateCompany } from "../api";
import { invalidateRecentAuditActions } from "@/features/audit-log";

type AddCompanyFormData = {
  name: string;
  contact_person?: string;
  phone_number?: string;
  address?: string;
};

export interface AddCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** Edit mode */
  company?: {
    id: number;
    name: string;
    contactPerson?: string | null;
    phoneNumber?: string | null;
    address?: string | null;
  } | null;
}

export function AddCompanyDialog({ open, onOpenChange, onSuccess, company }: AddCompanyDialogProps) {
  const t = useTranslations("company");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = React.useState(false);
  const isEdit = Boolean(company);

  const formSchema = React.useMemo(
    () =>
      z.object({
        name: z.string().min(1, t("nameRequired")),
        contact_person: z.string().optional(),
        phone_number: z.string().optional(),
        address: z.string().optional(),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<AddCompanyFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      contact_person: "",
      phone_number: "",
      address: "",
    },
  });

  React.useEffect(() => {
    if (!open) return;
    reset({
      name: company?.name ?? "",
      contact_person: company?.contactPerson ?? "",
      phone_number: company?.phoneNumber ?? "",
      address: company?.address ?? "",
    });
  }, [open, company, reset]);

  const onSubmit = async (data: AddCompanyFormData) => {
    setIsLoading(true);
    try {
      const payload = {
        name: data.name,
        contact_person: data.contact_person || null,
        phone_number: data.phone_number || null,
        address: data.address || null,
      };

      if (isEdit && company) {
        await updateCompany(company.id, payload);
        toast.success(t("updateSuccess"));
      } else {
        await createCompany(payload);
        toast.success(t("addSuccess"));
      }
      await invalidateRecentAuditActions(queryClient);

      onOpenChange(false);
      requestAnimationFrame(() => {
        setTimeout(() => {
          router.refresh();
          onSuccess?.();
        }, 150);
      });
    } catch (error) {
      toast.error(getErrorMessage(error, t("saveError")));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                {t("name")} <span className="text-destructive">*</span>
              </Label>
              <Input id="name" placeholder={t("namePlaceholder")} {...register("name")} disabled={isLoading} />
              {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact_person">{t("contactPerson")}</Label>
              <Input
                id="contact_person"
                placeholder={t("contactPlaceholder")}
                {...register("contact_person")}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone_number">{t("phone")}</Label>
              <Controller
                name="phone_number"
                control={control}
                render={({ field }) => (
                  <Input
                    id="phone_number"
                    placeholder="+998 XX XXX XX XX"
                    value={field.value || ""}
                    disabled={isLoading}
                    onChange={(e) => field.onChange(formatUzPhone(e.target.value))}
                  />
                )}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">{t("address")}</Label>
              <Input id="address" placeholder={t("addressPlaceholder")} {...register("address")} disabled={isLoading} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? tCommon("save") : tCommon("add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
