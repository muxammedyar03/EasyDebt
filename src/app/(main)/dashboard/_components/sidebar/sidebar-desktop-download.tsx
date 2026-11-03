"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Download, Monitor, HardDrive, Sparkles, CheckCircle2 } from "lucide-react";

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

const APP_VERSION = "v2.0.7";

export function SidebarDesktopDownload() {
  const t = useTranslations("desktopDownload");
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
              tooltip={t("tooltip")}
              className="bg-primary/5 hover:bg-primary/10 text-primary group border-primary/20 hover:border-primary/40 border font-medium transition-all"
            >
              <Download className="size-4 shrink-0 transition-transform group-hover:-translate-y-0.5" />
              {!isCollapsed && (
                <div className="flex flex-1 items-center justify-between text-xs leading-none">
                  <span className="font-semibold">{t("buttonLabel")}</span>
                  <Badge variant="outline" className="border-primary/30 text-primary h-4 px-1 text-[10px]">
                    {APP_VERSION}
                  </Badge>
                </div>
              )}
            </SidebarMenuButton>
          </DialogTrigger>

          <DialogContent className="max-w-md sm:max-w-xl">
            <DialogHeader className="space-y-3 pb-1">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 border-primary/20 flex size-12 shrink-0 items-center justify-center rounded-2xl border p-1 shadow-inner">
                  <Image
                    src="/images/edebt2.png"
                    alt="EasyDebt Logo"
                    width={40}
                    height={40}
                    className="size-9 object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <DialogTitle className="text-base font-semibold sm:text-lg">{t("title")}</DialogTitle>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {APP_VERSION}
                    </Badge>
                  </div>
                  <DialogDescription className="mt-1 text-xs sm:text-sm">{t("description")}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 pt-1">
              {/* Features highlight box */}
              <div className="bg-muted/40 border-border/80 space-y-2 rounded-xl border p-3.5 text-xs">
                <div className="text-foreground flex items-center gap-1.5 font-medium">
                  <Sparkles className="size-4 text-amber-500" />
                  <span>{t("featuresTitle")}</span>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <div className="text-muted-foreground flex items-start gap-1.5">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                    <span>{t("feature1")}</span>
                  </div>
                  <div className="text-muted-foreground flex items-start gap-1.5">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                    <span>{t("feature2")}</span>
                  </div>
                  <div className="text-muted-foreground flex items-start gap-1.5">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                    <span>{t("feature3")}</span>
                  </div>
                  <div className="text-muted-foreground flex items-start gap-1.5">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                    <span>{t("feature4")}</span>
                  </div>
                </div>
              </div>

              {/* Operating System Cards */}
              <div className="grid gap-2.5 sm:grid-cols-2">
                {/* Windows Card */}
                <div className="hover:border-primary/50 group relative flex flex-col justify-between rounded-xl border p-3.5 transition-all hover:shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor className="text-primary size-4" />
                        <span className="text-sm font-semibold">{t("windowsTitle")}</span>
                      </div>
                      <Badge className="border-sky-500/30 bg-sky-500/10 text-[10px] text-sky-500 hover:bg-sky-500/20">
                        {t("windowsBadge")}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{t("windowsDesc")}</p>
                  </div>
                  <Button className="mt-3.5 w-full gap-2 shadow-xs" size="sm" asChild>
                    <a href="/api/desktop/download?platform=windows" target="_blank" rel="noopener noreferrer">
                      <Download className="size-3.5 transition-transform group-hover:-translate-y-0.5" />
                      {t("windowsBtn")}
                    </a>
                  </Button>
                </div>

                {/* Ubuntu / Debian Card */}
                <div className="hover:border-primary/50 group relative flex flex-col justify-between rounded-xl border p-3.5 transition-all hover:shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className="text-primary size-4" />
                        <span className="text-sm font-semibold">{t("ubuntuTitle")}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {t("ubuntuBadge")}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{t("ubuntuDesc")}</p>
                  </div>
                  <Button variant="outline" className="mt-3.5 w-full gap-2 shadow-xs" size="sm" asChild>
                    <a href="/api/desktop/download?platform=deb" target="_blank" rel="noopener noreferrer">
                      <Download className="size-3.5 transition-transform group-hover:-translate-y-0.5" />
                      {t("ubuntuBtn")}
                    </a>
                  </Button>
                </div>
              </div>

              {/* Linux AppImage Universal */}
              <div className="hover:border-primary/40 flex items-center justify-between rounded-xl border p-3 text-xs transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="bg-muted flex size-8 items-center justify-center rounded-lg">
                    <HardDrive className="text-muted-foreground size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-foreground font-medium">{t("appimageTitle")}</span>
                      <Badge variant="secondary" className="px-1 py-0 text-[9px] font-normal">
                        {t("appimageBadge")}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px]">{t("appimageDesc")}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild className="h-8 gap-1.5 text-xs">
                  <a href="/api/desktop/download?platform=appimage" target="_blank" rel="noopener noreferrer">
                    <Download className="size-3" />
                    {t("appimageBtn")}
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
