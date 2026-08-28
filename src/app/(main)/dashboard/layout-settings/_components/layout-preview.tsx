"use client";

import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import type { ContentLayout, NavbarStyle, SidebarCollapsible, SidebarVariant } from "@/types/preferences/layout";
import type { ThemeMode, ThemePreset } from "@/types/preferences/theme";

type LayoutPreviewProps = {
  themeMode: ThemeMode;
  themePreset: ThemePreset;
  accentColor: string;
  variant: SidebarVariant;
  collapsible: SidebarCollapsible;
  navbarStyle: NavbarStyle;
  contentLayout: ContentLayout;
  className?: string;
};

export function LayoutPreview({
  themeMode,
  accentColor,
  variant,
  collapsible,
  navbarStyle,
  contentLayout,
  className,
}: LayoutPreviewProps) {
  const isDark = themeMode === "dark";
  const isIcon = collapsible === "icon";
  const isOffcanvas = collapsible === "offcanvas";
  const isFloating = variant === "floating";
  const isInset = variant === "inset";
  const isFull = contentLayout === "full-width";
  const isScrollNav = navbarStyle === "scroll";

  const sbWidth = isIcon ? 36 : 78;
  const contentPad = isFull ? 0 : "6%";

  return (
    <div
      className={cn(
        "layout-preview relative w-full overflow-hidden rounded-[10px] border transition-all duration-350",
        isDark ? "border-[#2a2f3a] bg-[#0c0e12]" : "border-border bg-[#eef0f3]",
        className,
      )}
      style={
        {
          "--lp-sidebar": accentColor,
          "--lp-sb-w": `${sbWidth}px`,
          "--lp-pad": contentPad,
          "--lp-panel": isDark ? "#1a1f29" : "#ffffff",
          "--lp-line": isDark ? "#2a3140" : "#e5e7eb",
          "--lp-soft": isDark ? "#12161e" : "#f3f4f6",
          "--lp-text": isDark ? "#e5e7eb" : "#111827",
          "--lp-dim": isDark ? "#6b7280" : "#9ca3af",
        } as CSSProperties
      }
    >
      <div className="layout-preview-ambient pointer-events-none absolute inset-[-20%] z-0" />

      {/* Sidebar */}
      <div
        className={cn(
          "absolute z-[2] flex flex-col gap-2 overflow-hidden rounded-lg bg-[var(--lp-sidebar)] p-2.5 transition-all duration-400",
          isInset && "top-0 bottom-0 left-0 rounded-none",
          isFloating && "top-3.5 bottom-3.5 left-3 shadow-[0_8px_20px_rgba(0,0,0,0.18)]",
          !isInset && !isFloating && "top-2 bottom-2 left-2",
          isOffcanvas && "-translate-x-[120%] opacity-0",
        )}
        style={{ width: "var(--lp-sb-w)" }}
      >
        <div className="mb-1 flex items-center gap-2 border-b border-white/12 px-1 pb-2">
          <div className="layout-preview-logo -ml-1 size-4 shrink-0 rounded-[5px] bg-white/90" />
          <div
            className={cn(
              "overflow-hidden text-[10px] font-semibold whitespace-nowrap text-white/90 transition-all duration-300",
              isIcon || isOffcanvas ? "max-w-0 opacity-0" : "max-w-20 opacity-100",
            )}
          >
            Debitor
          </div>
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "layout-preview-sb-item flex h-[18px] items-center justify-center gap-1.5 rounded-md px-1.5",
              i === 1 ? "bg-white/22" : "bg-white/10",
            )}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span className="ml-1.5 h-2 w-2 shrink-0 rounded-[3px] bg-white/75" />
            <span className={cn("h-1.5 flex-1 rounded-[3px] bg-white/35 transition-opacity", isIcon && "opacity-0")} />
          </div>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 border-t border-white/12 pt-1.5">
          <span className="size-4 shrink-0 rounded-full bg-gradient-to-br from-white to-white/50" />
          <span className={cn("h-1.5 max-w-10 flex-1 rounded-[3px] bg-white/35", isIcon && "opacity-0")} />
        </div>
      </div>

      {/* Navbar */}
      <div
        className={cn(
          "absolute top-2.5 right-2.5 z-[2] flex h-7 items-center gap-2 rounded-md border border-[var(--lp-line)] bg-[var(--lp-panel)] px-2.5 transition-all duration-300",
          isScrollNav && "-translate-y-7 opacity-20",
        )}
        style={{ left: isOffcanvas ? 10 : "calc(var(--lp-sb-w) + 16px)" }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <span className="h-1.5 w-9 rounded-[3px] bg-[var(--lp-soft)]" />
          <span className="layout-preview-crumb layout-preview-mix-45 h-1.5 w-13 rounded-[3px]" />
        </div>
        <div className="layout-preview-search relative h-4 w-[88px] overflow-hidden rounded-md border border-[var(--lp-line)] bg-[var(--lp-soft)]" />
        <div className="layout-preview-pill size-4 rounded-full" />
      </div>

      <div
        className="absolute right-2.5 bottom-2.5 z-[1] flex flex-col gap-2 transition-all duration-300"
        style={{
          left: isOffcanvas ? 10 : "calc(var(--lp-sb-w) + 16px)",
          top: 46,
          marginInline: "var(--lp-pad)",
        }}
      >
        <div className="grid grid-cols-3 gap-2">
          {[88, 72, 54].map((w, i) => (
            <div
              key={w}
              className="layout-preview-card rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel)] p-2"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="mb-2 h-1 w-[42%] rounded-[3px] bg-[var(--lp-dim)] opacity-45" />
              <div className="layout-preview-value mb-2 h-2.5 w-[58%] rounded bg-[var(--lp-text)] opacity-85" />
              <div className="h-1 overflow-hidden rounded-full bg-[var(--lp-soft)]">
                <i
                  className="layout-preview-bar block h-full rounded-full bg-[var(--lp-sidebar)]"
                  style={{ ["--w" as string]: `${w}%`, animationDelay: `${300 + i * 150}ms` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[1.25fr_1fr] gap-2">
          <div
            className="layout-preview-card relative flex flex-col gap-2 overflow-hidden rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel)] p-2.5"
            style={{ animationDelay: "200ms" }}
          >
            <div className="h-1.5 w-[36%] rounded-[3px] bg-[var(--lp-text)] opacity-55" />
            <div className="flex flex-1 items-end gap-1.5 pt-1.5">
              {[38, 62, 48, 78, 55, 90, 70].map((h, i) => (
                <span
                  key={h}
                  className={cn(
                    "layout-preview-chart-bar flex-1 origin-bottom rounded-t opacity-85",
                    i === 5 && "layout-preview-chart-active opacity-100",
                  )}
                  style={{ height: `${h}%`, animationDelay: `${350 + i * 70}ms` }}
                />
              ))}
            </div>
          </div>

          <div
            className="layout-preview-card flex flex-col gap-2 rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel)] p-2.5"
            style={{ animationDelay: "280ms" }}
          >
            <div className="h-1.5 w-[36%] rounded-[3px] bg-[var(--lp-text)] opacity-55" />
            <div className="flex flex-1 flex-col gap-1.5">
              {[72, 58, 80, 48, 65].map((w, i) => (
                <div
                  key={w}
                  className={cn(
                    "layout-preview-row grid grid-cols-[14px_1fr_28px] items-center gap-1.5",
                    i === 0 && "layout-preview-row-hl -mx-1 rounded px-1 py-0.5",
                  )}
                  style={{ animationDelay: `${400 + i * 100}ms` }}
                >
                  <span className="size-3.5 rounded-full border border-[var(--lp-line)] bg-[var(--lp-soft)]" />
                  <span className="h-1.5 rounded-[3px] bg-[var(--lp-text)] opacity-40" style={{ width: `${w}%` }} />
                  <span className="layout-preview-mix-55 h-1.5 rounded-[3px]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="layout-preview-click-ring pointer-events-none absolute z-[4]" />
      <div className="layout-preview-pointer pointer-events-none absolute z-[5]" aria-hidden>
        <svg viewBox="0 0 16 16" className="block size-3.5" fill="none">
          <path d="M2 2l4.5 11 1.8-4.2L12.5 7 2 2z" fill="#fff" stroke="#111" strokeWidth="1" />
        </svg>
      </div>
      <div className="layout-preview-shine pointer-events-none absolute inset-0 z-[3] opacity-25" />
    </div>
  );
}
