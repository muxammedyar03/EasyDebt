"use client";

import { ReactNode, useEffect, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";

const DESKTOP_BREAKPOINT = 1440;

type Props = {
  defaultOpenFromCookie: boolean;
  children: ReactNode;
};

export function SidebarProviderWithWidth({ defaultOpenFromCookie, children }: Props) {
  const [defaultOpen, setDefaultOpen] = useState<boolean | null>(null);

  useEffect(() => {
    setDefaultOpen(window.innerWidth > DESKTOP_BREAKPOINT);
  }, []);

  const resolvedOpen = defaultOpen !== null ? defaultOpen : defaultOpenFromCookie;

  return (
    <SidebarProvider key={resolvedOpen ? "true" : "false"} defaultOpen={resolvedOpen}>
      {children}
    </SidebarProvider>
  );
}
