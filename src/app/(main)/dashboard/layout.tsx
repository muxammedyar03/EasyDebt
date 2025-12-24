import { ReactNode } from "react";

import { cookies } from "next/headers";

import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
import { prisma } from "@/lib/prisma";

import { AccountSwitcher } from "./_components/sidebar/account-switcher";
import { LayoutControls } from "./_components/sidebar/layout-controls";
import { ThemeSwitcher } from "./_components/sidebar/theme-switcher";
import { NotificationsDropdown } from "./_components/notifications-dropdown";
import { getSession } from "@/lib/auth";
import { getEffectiveShopId } from "@/lib/shop-context";
import HeaderLockButton from "../_components/HeaderLockButton.client";
import PinGate from "../_components/PinGate.client";
import { ShopSwitcher } from "./_components/sidebar/shop-switcher";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  const session = await getSession();
  const effectiveShopId = getEffectiveShopId(session);

  // Get current shop info for display
  const currentShop = effectiveShopId
    ? await prisma.shop.findUnique({
        where: { id: effectiveShopId },
        select: { id: true, name: true },
      })
    : null;
  const [sidebarVariant, sidebarCollapsible, contentLayout, navbarStyle] = await Promise.all([
    getPreference<SidebarVariant>("sidebar_variant", SIDEBAR_VARIANT_VALUES, "inset"),
    getPreference<SidebarCollapsible>("sidebar_collapsible", SIDEBAR_COLLAPSIBLE_VALUES, "icon"),
    getPreference<ContentLayout>("content_layout", CONTENT_LAYOUT_VALUES, "centered"),
    getPreference<NavbarStyle>("navbar_style", NAVBAR_STYLE_VALUES, "scroll"),
  ]);

  // Get debt limit and notifications - Optimized with Promise.all
  const [debtLimitSetting, activeUser] = await Promise.all([
    prisma.settings.findFirst({
      where: {
        OR: [
          { shop_id: effectiveShopId, key: "debt_limit" }, // Shop-specific
          { shop_id: null, key: "debt_limit" }, // Global fallback
        ],
      },
      orderBy: { shop_id: "desc" }, // Shop-specific first
      select: { value: true },
    }),
    session
      ? prisma.user.findUnique({
          where: { id: session.userId },
          select: {
            id: true,
            username: true,
            email: true,
            first_name: true,
            last_name: true,
            role: true,
            shop_id: true,
            status: true,
          },
        })
      : null,
  ]);
  const [overdueDaysSetting] = await Promise.all([
    prisma.settings.findFirst({
      where: {
        OR: [
          { shop_id: effectiveShopId, key: "overdue_days" }, // Shop-specific
          { shop_id: null, key: "overdue_days" }, // Global fallback
        ],
      },
      orderBy: { shop_id: "desc" }, // Shop-specific first
      select: { value: true },
    }),
  ]);

  const debtLimit = debtLimitSetting ? parseFloat(debtLimitSetting.value) : 2000000;
  const overdueDays = overdueDaysSetting ? parseInt(overdueDaysSetting.value, 10) : 45;

  // Get notifications based on effective shop
  const notifications = await prisma.notification.findMany({
    where: {
      is_read: false,
      ...(effectiveShopId && { shop_id: effectiveShopId }),
    },
    orderBy: { created_at: "desc" },
    take: 3,
  });

  const layoutPreferences = {
    contentLayout,
    variant: sidebarVariant,
    collapsible: sidebarCollapsible,
    navbarStyle,
  };

  // Format active user for AccountSwitcher
  const formattedActiveUser = activeUser
    ? {
        id: activeUser.id.toString(),
        name:
          activeUser.first_name && activeUser.last_name
            ? `${activeUser.first_name} ${activeUser.last_name}`
            : activeUser.username,
        username: activeUser.username,
        email: activeUser.email || "",
        avatar: `/avatars/${activeUser.username}.png`,
        role: activeUser.role,
      }
    : {
        id: "1",
        name: "",
        username: "",
        email: "",
        avatar: "/avatars/user.png",
        role: "SUPER_ADMIN",
      };

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar variant={sidebarVariant} collapsible={sidebarCollapsible} currentShop={currentShop} />
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
    </SidebarProvider>
  );
}
