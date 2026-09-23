import { LOCALE_COOKIE, locales } from "@/i18n/config";
import {
  SIDEBAR_VARIANT_VALUES,
  SIDEBAR_COLLAPSIBLE_VALUES,
  CONTENT_LAYOUT_VALUES,
  NAVBAR_STYLE_VALUES,
} from "@/types/preferences/layout";
import { THEME_MODE_VALUES, THEME_PRESET_VALUES } from "@/types/preferences/theme";

const allowed: Record<string, readonly string[]> = {
  [LOCALE_COOKIE]: locales,
  theme_mode: THEME_MODE_VALUES,
  theme_preset: THEME_PRESET_VALUES,
  sidebar_variant: SIDEBAR_VARIANT_VALUES,
  sidebar_collapsible: SIDEBAR_COLLAPSIBLE_VALUES,
  content_layout: CONTENT_LAYOUT_VALUES,
  navbar_style: NAVBAR_STYLE_VALUES,
};

export function validatePreferenceCookie(key: string, value: string, options: { path?: string; maxAge?: number }) {
  if (!Object.hasOwn(allowed, key) || !allowed[key].includes(value)) throw new Error("Invalid preference");
  if (options.path !== undefined && options.path !== "/") throw new Error("Invalid preference path");
  const defaultAge = key === LOCALE_COOKIE ? 60 * 60 * 24 * 365 : 60 * 60 * 24 * 7;
  if (
    options.maxAge !== undefined &&
    (!Number.isSafeInteger(options.maxAge) || options.maxAge < 0 || options.maxAge > defaultAge)
  )
    throw new Error("Invalid preference expiration");
  return {
    path: "/",
    maxAge: options.maxAge ?? defaultAge,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
