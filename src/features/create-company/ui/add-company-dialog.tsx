"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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
import { addCompanySchema, type AddCompanyFormData } from "@/lib/validation/company";
import { createCompany, updateCompany } from "../api";

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
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const isEdit = Boolean(company);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<AddCompanyFormData>({
    resolver: zodResolver(addCompanySchema),
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
        toast.success("Kompaniya yangilandi");
      } else {
        await createCompany(payload);
        toast.success("Kompaniya qo'shildi");
      }

      onOpenChange(false);
      requestAnimationFrame(() => {
        setTimeout(() => {
          router.refresh();
          onSuccess?.();
        }, 150);
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Kompaniya saqlashda xatolik"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Kompaniyani tahrirlash" : "Yangi kompaniya"}</DialogTitle>
          <DialogDescription>Yetkazib beruvchi kompaniya ma&apos;lumotlarini kiriting</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Nomi <span className="text-destructive">*</span>
              </Label>
              <Input id="name" placeholder="Kompaniya nomi" {...register("name")} disabled={isLoading} />
              {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact_person">Mas&apos;ul shaxs</Label>
              <Input
                id="contact_person"
                placeholder="Ism familiya"
                {...register("contact_person")}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone_number">Telefon</Label>
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
              <Label htmlFor="address">Manzil</Label>
              <Input id="address" placeholder="Manzil" {...register("address")} disabled={isLoading} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Saqlash" : "Qo'shish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
