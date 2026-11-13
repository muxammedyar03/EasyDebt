"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ClientOption = {
  id: number;
  name: string;
  slug: string;
};

type FormValues = {
  username: string;
  email?: string;
  password: string;
  confirmPassword: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  client_id: number;
};

type CreateUserFormProps = {
  clients: ClientOption[];
  defaultClientId: number;
  actorRole: "SUPER_ADMIN" | "ADMIN";
};

export function CreateUserForm({ clients, defaultClientId, actorRole }: CreateUserFormProps) {
  const isSuperAdmin = actorRole === "SUPER_ADMIN";
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const formSchema = React.useMemo(
    () =>
      z
        .object({
          username: z.string().min(3, t("usernameMin")),
          email: z.string().email(t("emailInvalid")).optional().or(z.literal("")),
          password: z.string().min(6, t("passwordMin")),
          confirmPassword: z.string(),
          role: z.enum(["SUPER_ADMIN", "ADMIN", "USER"]),
          first_name: z.string().optional(),
          last_name: z.string().optional(),
          is_active: z.boolean().default(true),
          client_id: z.number().int().positive(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t("passwordMismatch"),
          path: ["confirmPassword"],
        }),
    [t],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "USER",
      first_name: "",
      last_name: "",
      is_active: true,
      client_id: defaultClientId,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.setValue("client_id", defaultClientId);
    }
  }, [open, defaultClientId, form]);

  async function onSubmit(values: FormValues) {
    if (!isSuperAdmin && values.role === "SUPER_ADMIN") {
      toast.error(tCommon("error"), { description: t("roleForbidden") });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: values.username,
          email: values.email || null,
          password: values.password,
          role: values.role,
          first_name: values.first_name || null,
          last_name: values.last_name || null,
          is_active: values.is_active,
          client_id: values.client_id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("genericError"));
      }

      toast.success(tCommon("success"), {
        description: t("createSuccess"),
      });

      form.reset({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "USER",
        first_name: "",
        last_name: "",
        is_active: true,
        client_id: defaultClientId,
      });
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(tCommon("error"), {
        description: error instanceof Error ? error.message : t("createError"),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-9">
          <Plus className="mr-2 h-4 w-4" />
          {t("createButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>{t("createDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("username")}</FormLabel>
                    <FormControl>
                      <Input placeholder="username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("email")}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("firstName")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("firstName")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("lastName")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("lastName")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("password")}</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="******" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("confirmPassword")}</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="******" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("role")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectRole")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USER">{t("roleUser")}</SelectItem>
                        <SelectItem value="ADMIN">{t("roleAdmin")}</SelectItem>
                        {isSuperAdmin && <SelectItem value="SUPER_ADMIN">{t("roleSuperAdmin")}</SelectItem>}
                      </SelectContent>
                    </Select>
                    <FormDescription>{t("roleHint")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isSuperAdmin && (
                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("client")}</FormLabel>
                      <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectClient")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={String(client.id)}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>{t("clientHint")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("createSubmit")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
