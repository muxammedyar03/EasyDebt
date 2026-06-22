"use client";

import Link from "next/link";
import { memo } from "react";

import { Command } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";

import { NavMain } from "./nav-main";

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

function AppSidebarInner({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href="/dashboard/default">
                <Command className="md:!h-5 md:!w-5" />
                <span className="text-base font-semibold">{APP_CONFIG.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItems} />
      </SidebarContent>
    </Sidebar>
  );
}

/** Memoized so layout re-renders (e.g. on route change) don't re-render sidebar when its props are unchanged (Task 3.1). */
export const AppSidebar = memo(AppSidebarInner);
