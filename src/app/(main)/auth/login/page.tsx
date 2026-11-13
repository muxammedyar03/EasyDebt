import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";
import { isAppLocale, LOCALE_COOKIE, type AppLocale } from "@/i18n/config";
import { getSession } from "@/lib/auth";

import { LoginForm } from "../_components/login-form";
import { LoginLocaleSwitch } from "../_components/login-locale-switch";

const copy = {
  ru: {
    title: "Вход в аккаунт",
    subtitle: "Пожалуйста, введите ваши данные для входа.",
    or: "или",
    demo: "Перейти на демо версию",
  },
  uz: {
    title: "Hisobga kirish",
    subtitle: "Kirish uchun ma'lumotlaringizni kiriting.",
    or: "yoki",
    demo: "Demo versiyaga o'tish",
  },
} as const;

export default async function LoginV2() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard/default");
  }

  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale: AppLocale = isAppLocale(cookieLocale) ? cookieLocale : "ru";
  const text = copy[locale];

  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-medium">{text.title}</h1>
          <p className="text-muted-foreground text-sm">{text.subtitle}</p>
        </div>
        <div className="space-y-4">
          <LoginForm key={locale} locale={locale} />
          <p className="text-muted-foreground text-center text-xs">{text.or}</p>
          <a
            href="https://easy-debt-8xhz.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 items-center justify-center gap-x-2 rounded-lg bg-blue-100 px-4 text-center text-sm font-medium text-blue-500 hover:bg-blue-100/80 hover:underline dark:bg-blue-900/10"
          >
            {text.demo}
            <ExternalLink width={16} height={16} />
          </a>
        </div>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-sm">{APP_CONFIG.copyright}</div>
        <LoginLocaleSwitch locale={locale} />
      </div>
    </>
  );
}
