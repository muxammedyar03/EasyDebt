"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { AppLocale } from "@/i18n/config";

const copy = {
  ru: {
    username: "Логин",
    usernamePlaceholder: "Введите ваш логин",
    usernameRequired: "Логин обязательно для заполнения.",
    password: "Пароль",
    passwordPlaceholder: "Введите пароль",
    passwordMin: "Пароль должен быть не менее 6 символов.",
    remember: "Запомнить меня на 30 дней",
    submit: "Войти",
    submitting: "Вход...",
    showPassword: "Показать пароль",
    hidePassword: "Скрыть пароль",
    failedTitle: "Ошибка входа",
    failedDescription: "Неверный логин или пароль",
    successTitle: "Вход выполнен",
    successDescription: "С возвращением",
    errorTitle: "Ошибка",
    errorDescription: "Не удалось подключиться к системе",
  },
  uz: {
    username: "Login",
    usernamePlaceholder: "Loginingizni kiriting",
    usernameRequired: "Login kiritilishi shart.",
    password: "Parol",
    passwordPlaceholder: "Parolni kiriting",
    passwordMin: "Parol kamida 6 ta belgidan iborat bo'lishi kerak.",
    remember: "Meni 30 kun eslab qolish",
    submit: "Kirish",
    submitting: "Kirilmoqda...",
    showPassword: "Parolni ko'rsatish",
    hidePassword: "Parolni yashirish",
    failedTitle: "Kirishda xatolik",
    failedDescription: "Login yoki parol noto'g'ri",
    successTitle: "Muvaffaqiyatli kirdingiz",
    successDescription: "Xush kelibsiz",
    errorTitle: "Xatolik",
    errorDescription: "Tizimga ulanishda kutilmagan xatolik yuz berdi",
  },
} as const;

function createSchema(locale: AppLocale) {
  const text = copy[locale];
  return z.object({
    username: z.string().min(1, { message: text.usernameRequired }),
    password: z.string().min(6, { message: text.passwordMin }),
    remember: z.boolean().optional(),
  });
}

export function LoginForm({ locale }: { locale: AppLocale }) {
  const router = useRouter();
  const text = copy[locale];
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<ReturnType<typeof createSchema>>>({
    resolver: zodResolver(createSchema(locale)),
    defaultValues: {
      username: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (data: z.infer<ReturnType<typeof createSchema>>) => {
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
        toast.error(text.failedTitle, {
          description: result.error || text.failedDescription,
        });
        return;
      }

      toast.success(text.successTitle, {
        description: `${text.successDescription}, ${result.user.username}!`,
      });

      router.push("/dashboard/default");
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      toast.error(text.errorTitle, {
        description: text.errorDescription,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{text.username}</FormLabel>
              <FormControl>
                <Input
                  id="username"
                  type="text"
                  placeholder={text.usernamePlaceholder}
                  autoComplete="username"
                  className="h-9 rounded-xl text-base md:text-base"
                  {...field}
                />
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
              <FormLabel>{text.password}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={text.passwordPlaceholder}
                    autoComplete="current-password"
                    className="h-9 rounded-xl pr-11 text-base md:text-base"
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1.5 size-9 -translate-y-1/2"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? text.hidePassword : text.showPassword}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </Button>
                </div>
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
                {text.remember}
              </FormLabel>
            </FormItem>
          )}
        />
        <Button className="h-9 w-full rounded-xl text-base" type="submit" disabled={isLoading}>
          {isLoading ? text.submitting : text.submit}
        </Button>
      </form>
    </Form>
  );
}
