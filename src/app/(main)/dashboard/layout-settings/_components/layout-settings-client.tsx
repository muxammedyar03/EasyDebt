"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cn } from "@/lib/utils";
import { updateContentLayout, updateNavbarStyle } from "@/lib/layout-utils";
import { updateThemeMode, updateThemePreset } from "@/lib/theme-utils";
import { setValueToCookie } from "@/server/server-actions";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";
import type { ContentLayout, NavbarStyle, SidebarCollapsible, SidebarVariant } from "@/types/preferences/layout";
import { THEME_PRESET_OPTIONS, type ThemeMode, type ThemePreset } from "@/types/preferences/theme";
import { LOCALE_COOKIE, type AppLocale } from "@/i18n/config";

import { LayoutPreview } from "./layout-preview";
import "./layout-preview.css";
import { Button } from "@/components/ui/button";
import { HomeIcon } from "lucide-react";

const PRESET_ACCENT: Record<ThemePreset, { light: string; dark: string }> = {
  default: { light: "#171a1f", dark: "#e5e7eb" },
  caffeine: { light: "#6b5344", dark: "#d4b896" },
  tangerine: { light: "#e85d2a", dark: "#e85d2a" },
  twitter: { light: "#1d9bf0", dark: "#1d9bf0" },
};

type Option<T extends string> = { value: T; label: string };

type LayoutSettingsClientProps = {
  variant: SidebarVariant;
  collapsible: SidebarCollapsible;
  contentLayout: ContentLayout;
  navbarStyle: NavbarStyle;
};

function SegmentGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex w-full gap-2">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "min-w-0 flex-1 rounded-xl border-[1.5px] px-2.5 py-2.5 text-center text-[13px] font-medium transition-all",
              active
                ? "border-primary bg-primary text-background font-semibold"
                : "border-border bg-background text-foreground hover:border-muted-foreground/40 hover:bg-muted/40",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function LayoutSettingsClient({
  variant: initialVariant,
  collapsible: initialCollapsible,
  contentLayout: initialContentLayout,
  navbarStyle: initialNavbarStyle,
}: LayoutSettingsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const locale = useLocale() as AppLocale;
  const tCommon = useTranslations("common");

  const themeMode = usePreferencesStore((s) => s.themeMode);
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);
  const themePreset = usePreferencesStore((s) => s.themePreset);
  const setThemePreset = usePreferencesStore((s) => s.setThemePreset);

  const [variant, setVariant] = useState(initialVariant);
  const [collapsible, setCollapsible] = useState(initialCollapsible);
  const [contentLayout, setContentLayout] = useState(initialContentLayout);
  const [navbarStyle, setNavbarStyle] = useState(initialNavbarStyle);

  const accentColor = PRESET_ACCENT[themePreset]?.[themeMode] ?? PRESET_ACCENT.default[themeMode];

  const caption = [
    THEME_PRESET_OPTIONS.find((p) => p.value === themePreset)?.label ?? themePreset,
    themeMode === "dark" ? "Тёмный" : "Светлый",
    variant === "inset" ? "Встроенная" : variant === "floating" ? "Плавающая" : "Боковая",
  ].join(" · ");

  const persist = async (key: string, value: string) => {
    await setValueToCookie(key, value);
  };

  const handleThemeMode = (value: ThemeMode) => {
    updateThemeMode(value);
    setThemeMode(value);
    void persist("theme_mode", value);
  };

  const handleThemePreset = (value: ThemePreset) => {
    updateThemePreset(value);
    setThemePreset(value);
    void persist("theme_preset", value);
  };

  const handleVariant = (value: SidebarVariant) => {
    setVariant(value);
    void persist("sidebar_variant", value).then(() => {
      startTransition(() => router.refresh());
    });
  };

  const handleCollapsible = (value: SidebarCollapsible) => {
    setCollapsible(value);
    void persist("sidebar_collapsible", value).then(() => {
      startTransition(() => router.refresh());
    });
  };

  const handleNavbar = (value: NavbarStyle) => {
    setNavbarStyle(value);
    updateNavbarStyle(value);
    void persist("navbar_style", value);
  };

  const handleContent = (value: ContentLayout) => {
    setContentLayout(value);
    updateContentLayout(value);
    void persist("content_layout", value);
  };

  const handleLocale = (value: AppLocale) => {
    if (value === locale) return;
    void setValueToCookie(LOCALE_COOKIE, value, { maxAge: 60 * 60 * 24 * 365 }).then(() => {
      startTransition(() => router.refresh());
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="size-8 h-12 w-12" onClick={() => router.push("/dashboard")}>
          <HomeIcon className="size-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Настройки макета</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Измените внешний вид панели — справа сразу видно результат.
          </p>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(300px,400px)_1fr]">
        <div
          className={cn(
            "bg-card order-2 flex flex-col gap-5 rounded-2xl border p-5 lg:order-1",
            isPending && "opacity-90",
          )}
        >
          <section className="space-y-2.5">
            <h2 className="text-sm font-semibold">Шаблон</h2>
            <div className="grid grid-cols-2 gap-2">
              {THEME_PRESET_OPTIONS.map((preset) => {
                const active = themePreset === preset.value;
                const swatch =
                  themeMode === "dark" ? PRESET_ACCENT[preset.value].dark : PRESET_ACCENT[preset.value].light;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleThemePreset(preset.value)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2.5 text-left transition-all",
                      active
                        ? "border-primary bg-primary text-background"
                        : "border-border bg-background hover:border-muted-foreground/40 hover:bg-muted/40",
                    )}
                  >
                    <span
                      className="size-[18px] shrink-0 rounded-full border-2 border-white/35 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
                      style={{ backgroundColor: swatch }}
                    />
                    <span>
                      <span className="block text-[12.5px] leading-tight font-semibold">{preset.label}</span>
                      <span className={cn("mt-0.5 block text-[11px]", active ? "opacity-70" : "text-muted-foreground")}>
                        {preset.value === "default"
                          ? "Основной"
                          : preset.value === "caffeine"
                            ? "Тёплый"
                            : preset.value === "tangerine"
                              ? "Акцент"
                              : "Синий"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2.5">
            <h2 className="text-sm font-semibold">Режим</h2>
            <SegmentGroup
              value={themeMode}
              onChange={handleThemeMode}
              options={[
                { value: "light", label: "Светлый" },
                { value: "dark", label: "Тёмный" },
              ]}
            />
          </section>

          <section className="space-y-2.5 sm:hidden">
            <h2 className="text-sm font-semibold">{tCommon("language")}</h2>
            <SegmentGroup
              value={locale}
              onChange={handleLocale}
              options={[
                { value: "uz", label: tCommon("uzbek") },
                { value: "ru", label: tCommon("russian") },
              ]}
            />
          </section>

          <section className="space-y-2.5">
            <h2 className="text-sm font-semibold">Боковая панель</h2>
            <SegmentGroup
              value={variant}
              onChange={handleVariant}
              options={[
                { value: "inset", label: "Встроенная" },
                { value: "sidebar", label: "Боковая" },
                { value: "floating", label: "Плавающая" },
              ]}
            />
          </section>

          <section className="space-y-2.5">
            <h2 className="text-sm font-semibold">Навигация</h2>
            <SegmentGroup
              value={navbarStyle}
              onChange={handleNavbar}
              options={[
                { value: "sticky", label: "Статичная" },
                { value: "scroll", label: "Динамичная" },
              ]}
            />
          </section>

          <section className="space-y-2.5">
            <h2 className="text-sm font-semibold">Сворачивание</h2>
            <SegmentGroup
              value={collapsible}
              onChange={handleCollapsible}
              options={[
                { value: "icon", label: "Иконка" },
                { value: "offcanvas", label: "Скрытая" },
              ]}
            />
          </section>

          <section className="space-y-2.5">
            <h2 className="text-sm font-semibold">Контент</h2>
            <SegmentGroup
              value={contentLayout}
              onChange={handleContent}
              options={[
                { value: "centered", label: "По центру" },
                { value: "full-width", label: "На всю ширину" },
              ]}
            />
          </section>
        </div>

        <div className="bg-card order-1 flex min-h-[min(520px,72vh)] flex-col gap-3 rounded-2xl border p-4 lg:sticky lg:top-20 lg:order-2 lg:min-h-[560px]">
          <div className="flex items-center justify-between gap-3">
            <span className="layout-preview-live-badge rounded-md bg-teal-100 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-teal-800 uppercase dark:bg-teal-950/50 dark:text-teal-300">
              Live preview
            </span>
            <span className="text-muted-foreground text-xs">{caption}</span>
          </div>
          <LayoutPreview
            key={`${themeMode}-${themePreset}-${variant}-${collapsible}-${navbarStyle}-${contentLayout}`}
            themeMode={themeMode}
            themePreset={themePreset}
            accentColor={accentColor}
            variant={variant}
            collapsible={collapsible}
            navbarStyle={navbarStyle}
            contentLayout={contentLayout}
            className="h-[min(460px,55vh)] w-full shrink-0 lg:h-[460px]"
          />
        </div>
      </div>
    </div>
  );
}
