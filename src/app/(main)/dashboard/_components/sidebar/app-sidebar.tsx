"use client";

import Link from "next/link";

import { Command } from "lucide-react";

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

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentShop?: { id: number; name: string } | null;
}

export function AppSidebar({ currentShop, ...props }: AppSidebarProps) {
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
        {/* <NavDocuments items={data.documents} />
        <NavSecondar items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
