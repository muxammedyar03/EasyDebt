"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const FormSchema = z.object({
  username: z.string().min(1, { message: "Login kiritilishi shart." }),
  password: z.string().min(6, { message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak." }),
  remember: z.boolean().optional(),
});

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      username: "",
      password: "",
      remember: true,
    },
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: data.username,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error("Kirishda xatolik", {
          description: result.error || "Login yoki parol noto'g'ri",
        });
        return;
      }

      toast.success("Muvaffaqiyatli kirdingiz", {
        description: `Xush kelibsiz, ${result.user.username}!`,
      });

      router.push("/dashboard/default");
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Xatolik", {
        description: "Tizimga ulanishda kutilmagan xatolik yuz berdi",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFillAdmin = () => {
    form.setValue("username", "admin");
    form.setValue("password", "admin123");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Foydalanuvchi nomi (Login)</FormLabel>
              <FormControl>
                <Input id="username" type="text" placeholder="admin" autoComplete="username" {...field} />
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
              <FormLabel>Parol</FormLabel>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="remember"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center">
              <FormControl>
                <Checkbox
                  id="login-remember"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="size-4"
                />
              </FormControl>
              <FormLabel htmlFor="login-remember" className="text-muted-foreground ml-1 text-sm font-medium">
                Meni 30 kun eslab qolish
              </FormLabel>
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? "Kirilmoqda..." : "Tizimga kirish"}
        </Button>

        <div className="pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-muted-foreground hover:text-foreground w-full text-xs"
            onClick={handleQuickFillAdmin}
          >
            <KeyRound className="mr-1.5 size-3.5" />
            Lokal Desktop Admin ma&apos;lumotlarini to&apos;ldirish (admin / admin123)
          </Button>
        </div>
      </form>
    </Form>
  );
}
