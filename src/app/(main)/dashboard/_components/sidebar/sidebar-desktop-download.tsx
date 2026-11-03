"use client";

import * as React from "react";
import { Download, Monitor, HardDrive, Sparkles } from "lucide-react";

import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isTauriDesktop } from "@/lib/desktop/tauri-bridge";

export function SidebarDesktopDownload() {
  const { isMobile, state } = useSidebar();
  const [mounted, setMounted] = React.useState(false);
  const [inTauri, setInTauri] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setInTauri(isTauriDesktop());
  }, []);

  if (!mounted || inTauri) {
    return null;
  }

  const isCollapsed = state === "collapsed" && !isMobile;

  return (
    <SidebarMenu className="mb-1">
      <SidebarMenuItem>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <SidebarMenuButton
              size="default"
              tooltip="Desktop versiyasini yuklab olish"
              className="bg-primary/5 hover:bg-primary/10 text-primary group border-primary/20 border font-medium transition-all"
            >
              <Download className="size-4 shrink-0 transition-transform group-hover:-translate-y-0.5" />
              {!isCollapsed && (
                <div className="flex flex-1 items-center justify-between text-xs leading-none">
                  <span className="font-semibold">Desktop ilova</span>
                  <Badge variant="outline" className="border-primary/30 text-primary h-4 px-1 text-[10px]">
                    v2.0.3
                  </Badge>
                </div>
              )}
            </SidebarMenuButton>
          </DialogTrigger>

          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Monitor className="text-primary size-5" />
                <span>EasyDebt Desktop — Kompyuter Dasturi</span>
              </DialogTitle>
              <DialogDescription>
                Windows va Ubuntu kompyuterlarida internet uzilganda ham uzluksiz, offlayn ishlash imkoniyati.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="bg-muted/40 space-y-1.5 rounded-lg border p-3 text-xs">
                <div className="text-foreground flex items-center gap-1.5 font-medium">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>Desktop versiyaning afzalliklari:</span>
                </div>
                <ul className="text-muted-foreground list-inside list-disc space-y-0.5 pl-1">
                  <li>Internet yo&apos;qligida ham qarz va to&apos;lovlarni kiritish (lokal SQLite/JSON)</li>
                  <li>Internet paydo bo&apos;lganda avtomatik bulutga sinxronlash</li>
                  <li>
                    POS termal chek printerlariga (80mm / 58mm) to&apos;g&apos;ridan-to&apos;g&apos;ri tezkor chop etish
                  </li>
                  <li>Avtomatik tizim yangilanishlari (Auto-update)</li>
                </ul>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {/* Windows */}
                <div className="hover:border-primary/50 flex flex-col justify-between rounded-lg border p-3 transition-colors">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Windows</span>
                      <Badge variant="secondary" className="text-[10px]">
                        Tavsiya
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Windows 10, 11 (64-bit). Standart o&apos;rnatuvchi fayl (.exe).
                    </p>
                  </div>
                  <Button className="mt-3 w-full gap-1.5" size="sm" asChild>
                    <a href="/api/desktop/download?platform=windows" target="_blank" rel="noopener noreferrer">
                      <Download className="size-3.5" />
                      Windows (.exe)
                    </a>
                  </Button>
                </div>

                {/* Ubuntu / Debian */}
                <div className="hover:border-primary/50 flex flex-col justify-between rounded-lg border p-3 transition-colors">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Ubuntu / Debian</span>
                      <Badge variant="outline" className="text-[10px]">
                        Linux
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Ubuntu 20.04+, Debian, Mint (.deb to&apos;plami).
                    </p>
                  </div>
                  <Button variant="outline" className="mt-3 w-full gap-1.5" size="sm" asChild>
                    <a href="/api/desktop/download?platform=deb" target="_blank" rel="noopener noreferrer">
                      <Download className="size-3.5" />
                      Ubuntu (.deb)
                    </a>
                  </Button>
                </div>
              </div>

              {/* Linux AppImage Universal */}
              <div className="flex items-center justify-between rounded-lg border p-3 text-xs">
                <div className="flex items-center gap-2">
                  <HardDrive className="text-muted-foreground size-4" />
                  <div>
                    <span className="text-foreground font-medium">Linux Universal (Portativ)</span>
                    <p className="text-muted-foreground text-[11px]">
                      O&apos;rnatishsiz ishga tushuvchi .AppImage fayli
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild className="h-8 gap-1 text-xs">
                  <a href="/api/desktop/download?platform=appimage" target="_blank" rel="noopener noreferrer">
                    <Download className="size-3" />
                    .AppImage
                  </a>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
