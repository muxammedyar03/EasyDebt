"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const formSchema = z
  .object({
    username: z.string().min(3, "Username kamida 3 ta belgidan iborat bo'lishi kerak"),
    email: z.string().email("To'g'ri email kiriting").optional().or(z.literal("")),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    role: z.enum(["SUPER_ADMIN", "ADMIN", "USER"]),
    is_active: z.boolean(),
    password: z.string().min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak").optional().or(z.literal("")),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.password && data.password.length > 0) return data.password === data.confirmPassword;
      return true;
    },
    { message: "Parollar mos kelmayapti", path: ["confirmPassword"] },
  );

type FormValues = z.infer<typeof formSchema>;

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

const roleLabels: Record<EditUserFormUser["role"], string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  USER: "User",
};

export function EditUserForm({ user }: EditUserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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
        throw new Error(data.error || "Xatolik yuz berdi");
      }

      toast.success("Muvaffaqiyatli", {
        description: "Foydalanuvchi yangilandi",
      });

      router.push("/dashboard/users");
      router.refresh();
    } catch (error) {
      toast.error("Xatolik", {
        description: error instanceof Error ? error.message : "Foydalanuvchini yangilashda xatolik",
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
                <FormLabel>Username *</FormLabel>
                <FormControl>
                  <Input placeholder="username" {...field} className="flex h-11 items-center" />
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
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" className="flex h-11 items-center" placeholder="email@example.com" {...field} />
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
                <FormLabel>Ism</FormLabel>
                <FormControl>
                  <Input className="flex h-11 items-center" placeholder="Ism" {...field} />
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
                <FormLabel>Familiya</FormLabel>
                <FormControl>
                  <Input className="flex h-11 items-center" placeholder="Familiya" {...field} />
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
                <FormLabel>Rol *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="!h-11 px-4">
                      <SelectValue placeholder="Rolni tanlang" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem className="h-10 px-4" value="USER">
                      {roleLabels.USER}
                    </SelectItem>
                    <SelectItem className="h-10 px-4" value="ADMIN">
                      {roleLabels.ADMIN}
                    </SelectItem>
                    <SelectItem className="h-10 px-4" value="SUPER_ADMIN">
                      {roleLabels.SUPER_ADMIN}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>Foydalanuvchi rolini yangilang</FormDescription>
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
                  <FormLabel className="text-base">Faol</FormLabel>
                  <FormDescription>Foydalanuvchi tizimga kirishi mumkin</FormDescription>
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
                <FormLabel>Yangi parol</FormLabel>
                <FormControl>
                  <Input
                    className="flex h-11 items-center"
                    type="password"
                    placeholder="O'zgartirmasangiz bo'sh qoldiring"
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
                <FormLabel>Yangi parolni tasdiqlash</FormLabel>
                <FormControl>
                  <Input className="flex h-11 items-center" type="password" placeholder="******" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-4">
          <Button
            className="h-11 px-4"
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/users")}
            disabled={isLoading}
          >
            Bekor qilish
          </Button>
          <Button className="h-11 px-4" type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Saqlash
          </Button>
        </div>
      </form>
    </Form>
  );
}
