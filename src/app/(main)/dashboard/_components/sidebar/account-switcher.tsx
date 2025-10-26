"use client";

import { useState } from "react";

import { BadgeCheck, LogOut, Settings } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { cn, getInitials } from "@/lib/utils";
import { SettingsDialog } from "@/app/(main)/dashboard/_components/settings-dialog";
import { useRouter } from "next/navigation";

export function AccountSwitcher({
  debtLimit,
  activeUser,
}: {
  readonly debtLimit: number;
  readonly activeUser: {
    readonly id: string;
    readonly name: string;
    readonly username?: string;
    readonly email: string;
    readonly avatar: string;
    readonly role: string;
  };
}) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleLogout = async () => {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    if (response.ok) {
      window.location.reload();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-9 rounded-lg md:h-12 md:w-12">
          <AvatarImage src={"/avatars/user.png"} alt={activeUser.name} />
          <AvatarFallback className="rounded-lg">{getInitials(activeUser.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 space-y-1 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <DropdownMenuItem
          className={cn("p-0", activeUser.id === activeUser.id && "bg-accent/50 border-l-primary border-l-2")}
        >
          <div className="flex w-full items-center justify-between gap-2 px-1 py-1.5">
            <Avatar className="size-9 rounded-lg">
              <AvatarImage src={"/avatars/user.png"} alt={activeUser.name} />
              <AvatarFallback className="rounded-lg">{getInitials(activeUser.name)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{activeUser.name}</span>
              <span className="truncate text-xs capitalize">{activeUser.role}</span>
            </div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/dashboard/profile/me")}>
            <BadgeCheck />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Settings />
            Sozlamalar
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            handleLogout();
          }}
        >
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} initialDebtLimit={debtLimit} />
    </DropdownMenu>
  );
}
