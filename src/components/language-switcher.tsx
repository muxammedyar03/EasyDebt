"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setValueToCookie } from "@/server/server-actions";
import { LOCALE_COOKIE, type AppLocale } from "@/i18n/config";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("common");
  const router = useRouter();

  const setLocale = async (next: AppLocale) => {
    if (next === locale) return;
    await setValueToCookie(LOCALE_COOKIE, next, { maxAge: 60 * 60 * 24 * 365 });
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("h-10 gap-2 px-2.5", className)} aria-label={t("language")}>
          <Languages className="h-4 w-4 lg:h-5 lg:w-5" />
          <span className="hidden text-sm font-medium sm:inline">{locale.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLocale("uz")} disabled={locale === "uz"}>
          {t("uzbek")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocale("ru")} disabled={locale === "ru"}>
          {t("russian")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
