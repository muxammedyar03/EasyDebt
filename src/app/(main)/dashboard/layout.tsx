import { ReactNode } from "react";

import { cookies } from "next/headers";

import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { SidebarProviderWithWidth } from "@/app/(main)/dashboard/_components/sidebar/sidebar-provider-with-width";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { getPreference } from "@/server/server-actions";
import {
  SIDEBAR_VARIANT_VALUES,
  SIDEBAR_COLLAPSIBLE_VALUES,
  CONTENT_LAYOUT_VALUES,
  NAVBAR_STYLE_VALUES,
  type SidebarVariant,
  type SidebarCollapsible,
  type ContentLayout,
  type NavbarStyle,
} from "@/types/preferences/layout";
import { getDashboardLayoutData } from "@/lib/dashboard-layout";

import { AccountSwitcher } from "./_components/sidebar/account-switcher";
import { LayoutControls } from "./_components/sidebar/layout-controls";
import { ThemeSwitcher } from "./_components/sidebar/theme-switcher";
import { NotificationsDropdown } from "./_components/notifications-dropdown";
import HeaderLockButton from "../_components/HeaderLockButton.client";
import PinGate from "../_components/PinGate.client";
import { ShopSwitcher } from "./_components/sidebar/shop-switcher";
import { prisma } from "@/lib/prisma";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  const [layoutData, sidebarVariant, sidebarCollapsible, contentLayout, navbarStyle] = await Promise.all([
    getDashboardLayoutData(),
    getPreference<SidebarVariant>("sidebar_variant", SIDEBAR_VARIANT_VALUES, "inset"),
    getPreference<SidebarCollapsible>("sidebar_collapsible", SIDEBAR_COLLAPSIBLE_VALUES, "icon"),
    getPreference<ContentLayout>("content_layout", CONTENT_LAYOUT_VALUES, "centered"),
    getPreference<NavbarStyle>("navbar_style", NAVBAR_STYLE_VALUES, "scroll"),
  ]);
  
  const { session, shopId, debtLimit, overdueDays, activeUser: formattedActiveUser, notifications } = layoutData;

  // Get current shop info for display
  const currentShop = shopId
    ? await prisma.shop.findUnique({
        where: { id: shopId },
        select: { id: true, name: true },
      })
    : null;


  const layoutPreferences = {
    contentLayout,
    variant: sidebarVariant,
    collapsible: sidebarCollapsible,
    navbarStyle,
  };

  return (
    <SidebarProviderWithWidth defaultOpenFromCookie={defaultOpen}>
      <AppSidebar variant={sidebarVariant} collapsible={sidebarCollapsible} />
      <SidebarInset
        data-content-layout={contentLayout}
        className={cn(
          "data-[content-layout=centered]:!mx-auto data-[content-layout=centered]:max-w-screen-2xl",
          "max-[113rem]:peer-data-[variant=inset]:!mr-2 min-[101rem]:peer-data-[variant=inset]:peer-data-[state=collapsed]:!mr-auto",
        )}
      >
        <header
          data-navbar-style={navbarStyle}
          className={cn(
            "flex h-18 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-18",
            // Handle sticky navbar style with conditional classes so blur, background, z-index, and rounded corners remain consistent across all SidebarVariant layouts.
            "data-[navbar-style=sticky]:bg-background/50 data-[navbar-style=sticky]:sticky data-[navbar-style=sticky]:top-0 data-[navbar-style=sticky]:z-50 data-[navbar-style=sticky]:overflow-hidden data-[navbar-style=sticky]:rounded-t-[inherit] data-[navbar-style=sticky]:backdrop-blur-md",
          )}
        >
          <div className="flex w-full items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-1 lg:gap-2">
              <SidebarTrigger className="border-border bg-card hover:bg-card/80 text-inherit-foreground border text-2xl md:-ml-4" />
              <Separator
                orientation="vertical"
                className="data-[orientation=vertical]:bg-border ml-2 data-[orientation=vertical]:h-10"
              />
              <div className="h-full">
                <ShopSwitcher
                  currentShop={currentShop || null}
                  role={session?.role || "USER"}
                  needsSelection={session?.role === "SUPER_ADMIN"}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationsDropdown notifications={notifications} />
              <div>{session?.userId && <HeaderLockButton />}</div>
              <LayoutControls {...layoutPreferences} />
              <ThemeSwitcher />
              <AccountSwitcher activeUser={formattedActiveUser} debtLimit={debtLimit} overdueDays={overdueDays} />
            </div>
          </div>
        </header>
        <div className="h-full p-4 md:p-6">{children}</div>
        {session?.userId ? <PinGate userId={session.userId} pinLength={4} /> : null}
      </SidebarInset>
    </SidebarProviderWithWidth>
  );
}
