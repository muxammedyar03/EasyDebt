import { ReactNode } from "react";

import { cookies } from "next/headers";

import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { users } from "@/data/users";
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

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  const session = await getSession();
  const [sidebarVariant, sidebarCollapsible, contentLayout, navbarStyle] = await Promise.all([
    getPreference<SidebarVariant>("sidebar_variant", SIDEBAR_VARIANT_VALUES, "inset"),
    getPreference<SidebarCollapsible>("sidebar_collapsible", SIDEBAR_COLLAPSIBLE_VALUES, "icon"),
    getPreference<ContentLayout>("content_layout", CONTENT_LAYOUT_VALUES, "centered"),
    getPreference<NavbarStyle>("navbar_style", NAVBAR_STYLE_VALUES, "scroll"),
  ]);

  // Get debt limit and notifications - Optimized with Promise.all
  const [debtLimitSetting, activeUser] = await Promise.all([
    prisma.settings.findUnique({
      where: { key: "debt_limit" },
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
          },
        })
      : null,
  ]);

  const debtLimit = debtLimitSetting ? parseFloat(debtLimitSetting.value) : 2000000;

  // Fetch debtors over limit with optimized query
  const debtorsOverLimit = await prisma.debtor.findMany({
    where: {
      total_debt: { gt: debtLimit },
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      total_debt: true,
    },
    take: 10, // Limit to 10 notifications for performance
    orderBy: {
      total_debt: "desc",
    },
  });

  const notifications = debtorsOverLimit.map((debtor) => ({
    id: debtor.id,
    debtor_id: debtor.id,
    debtor_name: `${debtor.first_name} ${debtor.last_name}`,
    total_debt: debtor.total_debt.toNumber(),
    debt_limit: debtLimit,
  }));

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
    : users[0]; // Fallback to first user if no session

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
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
            "flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
            // Handle sticky navbar style with conditional classes so blur, background, z-index, and rounded corners remain consistent across all SidebarVariant layouts.
            "data-[navbar-style=sticky]:bg-background/50 data-[navbar-style=sticky]:sticky data-[navbar-style=sticky]:top-0 data-[navbar-style=sticky]:z-50 data-[navbar-style=sticky]:overflow-hidden data-[navbar-style=sticky]:rounded-t-[inherit] data-[navbar-style=sticky]:backdrop-blur-md",
          )}
        >
          <div className="flex w-full items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-4" />
              <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            </div>
            <div className="flex items-center gap-2">
              <NotificationsDropdown notifications={notifications} />
              <LayoutControls {...layoutPreferences} />
              <ThemeSwitcher />
              <AccountSwitcher activeUser={formattedActiveUser} debtLimit={debtLimit} />
            </div>
          </div>
        </header>
        <div className="h-full p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
