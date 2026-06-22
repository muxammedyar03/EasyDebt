"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LayoutSettingsForm } from "@/app/(main)/dashboard/_components/layout-settings-form";
import { t } from "@/lib/i18n";
import type { SidebarVariant, SidebarCollapsible, ContentLayout, NavbarStyle } from "@/types/preferences/layout";

type LayoutSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: SidebarVariant;
  collapsible: SidebarCollapsible;
  contentLayout: ContentLayout;
  navbarStyle: NavbarStyle;
};

export function LayoutSettingsDialog({
  open,
  onOpenChange,
  variant,
  collapsible,
  contentLayout,
  navbarStyle,
}: LayoutSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("layoutSettings.title")}</DialogTitle>
          <DialogDescription>{t("layoutSettings.description")}</DialogDescription>
        </DialogHeader>
        <LayoutSettingsForm
          variant={variant}
          collapsible={collapsible}
          contentLayout={contentLayout}
          navbarStyle={navbarStyle}
        />
      </DialogContent>
    </Dialog>
  );
}
