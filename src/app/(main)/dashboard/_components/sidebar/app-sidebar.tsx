"use client";

import { memo } from "react";

import Image from "next/image";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { SidebarDesktopDownload } from "./sidebar-desktop-download";

// const data = {
//   navSecondary: [
//     {
//       title: "Settings",
//       url: "#",
//       icon: Settings,
//     },
//     {
//       title: "Get Help",
//       url: "#",
//       icon: CircleHelp,
//     },
//     {
//       title: "Search",
//       url: "#",
//       icon: Search,
//     },
//   ],
//   documents: [
//     {
//       name: "Data Library",
//       url: "#",
//       icon: Database,
//     },
//     {
//       name: "Reports",
//       url: "#",
//       icon: ClipboardList,
//     },
//     {
//       name: "Word Assistant",
//       url: "#",
//       icon: File,
//     },
//   ],
// };

function AppSidebarInner({
  allowedPermissions = [],
  ...props
}: React.ComponentProps<typeof Sidebar> & { allowedPermissions?: string[] }) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="group-data-[collapsible=icon]:!p-0 data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard/default">
                <Image
                  src="/images/edebt2.png"
                  className="size-9 shrink-0 object-contain group-data-[collapsible=icon]:size-8"
                  alt={APP_CONFIG.name}
                  loading="lazy"
                  width={40}
                  height={40}
                />
                <span className="text-xl font-semibold group-data-[collapsible=icon]:hidden">{APP_CONFIG.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItems} allowedPermissions={allowedPermissions} />
        {/* <NavDocuments items={data.documents} />
        <NavSecondar items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <SidebarDesktopDownload />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}

/** Memoized so layout re-renders (e.g. on route change) don't re-render sidebar when its props are unchanged (Task 3.1). */
export const AppSidebar = memo(AppSidebarInner);
