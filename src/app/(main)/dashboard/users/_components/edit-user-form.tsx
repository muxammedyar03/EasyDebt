"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type FormValues = {
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  is_active: boolean;
  password?: string;
  confirmPassword?: string;
};

export interface EditUserFormUser {
  id: number;
  username: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  first_name: string;
  last_name: string;
  is_active: boolean;
}

interface EditUserFormProps {
  user: EditUserFormUser;
}

export function EditUserForm({ user }: EditUserFormProps) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const formSchema = React.useMemo(
    () =>
      z
        .object({
          username: z.string().min(3, t("usernameMin")),
          email: z.string().email(t("emailInvalid")).optional().or(z.literal("")),
          first_name: z.string().optional(),
          last_name: z.string().optional(),
          role: z.enum(["SUPER_ADMIN", "ADMIN", "USER"]),
          is_active: z.boolean(),
          password: z.string().min(6, t("passwordMin")).optional().or(z.literal("")),
          confirmPassword: z.string().optional(),
        })
        .refine(
          (data) => {
            if (data.password && data.password.length > 0) return data.password === data.confirmPassword;
            return true;
          },
          { message: t("passwordMismatch"), path: ["confirmPassword"] },
        ),
    [t],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: user.username,
      email: user.email || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      role: user.role,
      is_active: user.is_active,
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      const body: Record<string, unknown> = {
        username: values.username,
        email: values.email || null,
        first_name: values.first_name || null,
        last_name: values.last_name || null,
        role: values.role,
        is_active: values.is_active,
      };
      if (values.password && values.password.length >= 6) {
        body.password = values.password;
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("genericError"));
      }

      toast.success(tCommon("success"), {
        description: t("updateSuccess"),
      });

      router.push("/dashboard/users");
      router.refresh();
    } catch (error) {
      toast.error(tCommon("error"), {
        description: error instanceof Error ? error.message : t("updateError"),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
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
                  <Input placeholder="username" {...field} className="flex h-9 items-center" />
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
                  <Input type="email" className="flex h-9 items-center" placeholder="email@example.com" {...field} />
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
                  <Input className="flex h-9 items-center" placeholder={t("firstName")} {...field} />
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
                  <Input className="flex h-9 items-center" placeholder={t("lastName")} {...field} />
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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="!h-9 px-4">
                      <SelectValue placeholder={t("selectRole")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem className="h-10 px-4" value="USER">
                      {t("roleUser")}
                    </SelectItem>
                    <SelectItem className="h-10 px-4" value="ADMIN">
                      {t("roleAdmin")}
                    </SelectItem>
                    <SelectItem className="h-10 px-4" value="SUPER_ADMIN">
                      {t("roleSuperAdmin")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>{t("roleHintEdit")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">{t("active")}</FormLabel>
                  <FormDescription>{t("activeHint")}</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("newPassword")}</FormLabel>
                <FormControl>
                  <Input
                    className="flex h-9 items-center"
                    type="password"
                    placeholder={t("newPasswordPlaceholder")}
                    {...field}
                  />
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
                <FormLabel>{t("newPasswordConfirm")}</FormLabel>
                <FormControl>
                  <Input className="flex h-9 items-center" type="password" placeholder="******" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-4">
          <Button
            className="h-9 px-4"
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/users")}
            disabled={isLoading}
          >
            {tCommon("cancel")}
          </Button>
          <Button className="h-9 px-4" type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tCommon("save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
