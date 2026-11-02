"use client";

import { Globe } from "lucide-react";

import { LOCALE_COOKIE, type AppLocale } from "@/i18n/config";
import { setValueToCookie } from "@/server/server-actions";

export function LoginLocaleSwitch({ locale }: { locale: AppLocale }) {
  const setLocale = async (next: AppLocale) => {
    if (next === locale) return;
    await setValueToCookie(LOCALE_COOKIE, next, { maxAge: 60 * 60 * 24 * 365 });
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-1 text-sm">
      <Globe className="text-muted-foreground size-4" />
      <button
        type="button"
        onClick={() => void setLocale("uz")}
        className={locale === "uz" ? "font-semibold" : "text-muted-foreground hover:text-foreground"}
        aria-pressed={locale === "uz"}
      >
        UZ
      </button>
      <span className="text-muted-foreground">/</span>
      <button
        type="button"
        onClick={() => void setLocale("ru")}
        className={locale === "ru" ? "font-semibold" : "text-muted-foreground hover:text-foreground"}
        aria-pressed={locale === "ru"}
      >
        RU
      </button>
    </div>
  );
}
