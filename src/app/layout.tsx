import { ReactNode } from "react";

import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { Toaster } from "@/components/ui/sonner";
import { APP_CONFIG } from "@/config/app-config";
import { getPreference } from "@/server/server-actions";
import { QueryProvider } from "@/app/providers/query-provider";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { THEME_MODE_VALUES, THEME_PRESET_VALUES, type ThemePreset, type ThemeMode } from "@/types/preferences/theme";

import "./globals.css";
import "@/styles/receipt-print.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_CONFIG.meta.title,
  description: APP_CONFIG.meta.description,
  openGraph: {
    title: APP_CONFIG.meta.title,
    description: APP_CONFIG.meta.description,
  },
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const themeMode = await getPreference<ThemeMode>("theme_mode", THEME_MODE_VALUES, "light");
  const themePreset = await getPreference<ThemePreset>("theme_preset", THEME_PRESET_VALUES, "default");
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={themeMode === "dark" ? "dark" : ""}
      data-theme-preset={themePreset}
      suppressHydrationWarning
    >
      <body className={`min-h-screen antialiased ${inter.className}`} suppressHydrationWarning>
        <QueryProvider>
          <ServiceWorkerRegister />
          <NextIntlClientProvider locale={locale} messages={messages}>
            <PreferencesStoreProvider themeMode={themeMode} themePreset={themePreset}>
              {children}
              <Toaster />
            </PreferencesStoreProvider>
          </NextIntlClientProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
