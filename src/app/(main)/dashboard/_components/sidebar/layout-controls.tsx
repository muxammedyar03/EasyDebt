"use client";

import React from "react";
import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { updateContentLayout, updateNavbarStyle } from "@/lib/layout-utils";
import { updateThemeMode, updateThemePreset } from "@/lib/theme-utils";
import { setValueToCookie } from "@/server/server-actions";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";
import type { SidebarVariant, SidebarCollapsible, ContentLayout, NavbarStyle } from "@/types/preferences/layout";
import { THEME_PRESET_OPTIONS, type ThemePreset, type ThemeMode } from "@/types/preferences/theme";

type LayoutControlsProps = {
  readonly variant: SidebarVariant;
  readonly collapsible: SidebarCollapsible;
  readonly contentLayout: ContentLayout;
  readonly navbarStyle: NavbarStyle;
};

export function LayoutControls(props: LayoutControlsProps) {
  const { variant, collapsible, contentLayout, navbarStyle } = props;

  const themeMode = usePreferencesStore((s) => s.themeMode);
  const setThemeMode = usePreferencesStore((s) => s.setThemeMode);
  const themePreset = usePreferencesStore((s) => s.themePreset);
  const setThemePreset = usePreferencesStore((s) => s.setThemePreset);

  const handleValueChange = async (key: string, value: string) => {
    if (key === "theme_mode") {
      updateThemeMode(value as ThemeMode);
      setThemeMode(value as ThemeMode);
    }

    if (key === "theme_preset") {
      updateThemePreset(value as ThemePreset);
      setThemePreset(value as ThemePreset);
    }

    if (key === "content_layout") {
      updateContentLayout(value as ContentLayout);
    }

    if (key === "navbar_style") {
      updateNavbarStyle(value as NavbarStyle);
    }
    await setValueToCookie(key, value);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="md:h-12 md:w-12">
          <Settings className="md:!h-6 md:!w-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end">
        <div className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <h4 className="text-sm leading-none font-medium">Boshqaruv paneli sozlamalari</h4>
            <p className="text-muted-foreground text-xs">Boshqaruv paneli sozlamalarini o&apos;zgartiring.</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Shablon</Label>
              <Select value={themePreset} onValueChange={(value) => handleValueChange("theme_preset", value)}>
                <SelectTrigger size="sm" className="w-full text-xs">
                  <SelectValue placeholder="Shablon" />
                </SelectTrigger>
                <SelectContent>
                  {THEME_PRESET_OPTIONS.map((preset) => (
                    <SelectItem key={preset.value} className="text-xs" value={preset.value}>
                      <span
                        className="size-2.5 rounded-full"
                        style={{
                          backgroundColor: themeMode === "dark" ? preset.primary.dark : preset.primary.light,
                        }}
                      />
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Rejim</Label>
              <ToggleGroup
                className="w-full"
                size="sm"
                variant="outline"
                type="single"
                value={themeMode}
                onValueChange={(value) => handleValueChange("theme_mode", value)}
              >
                <ToggleGroupItem className="text-xs" value="light" aria-label="Ochiq rejimga o'tish">
                  Ochiq
                </ToggleGroupItem>
                <ToggleGroupItem className="text-xs" value="dark" aria-label="Qorong'i rejimga o'tish">
                  Qorong&apos;i
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Yon panel turi</Label>
              <ToggleGroup
                className="w-full"
                size="sm"
                variant="outline"
                type="single"
                value={variant}
                onValueChange={(value) => handleValueChange("sidebar_variant", value)}
              >
                <ToggleGroupItem className="text-xs" value="inset" aria-label="Ichki rejimga o'tish">
                  Ichki
                </ToggleGroupItem>
                <ToggleGroupItem className="text-xs" value="sidebar" aria-label="Yon panel rejimiga o'tish">
                  Yon Panel
                </ToggleGroupItem>
                <ToggleGroupItem className="text-xs" value="floating" aria-label="Suzuvchi rejimga o'tish">
                  Suzuvchi
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Navigatsiya usuli</Label>
              <ToggleGroup
                className="w-full"
                size="sm"
                variant="outline"
                type="single"
                value={navbarStyle}
                onValueChange={(value) => handleValueChange("navbar_style", value)}
              >
                <ToggleGroupItem className="text-xs" value="sticky" aria-label="Yopishqoq rejimga o'tish">
                  Statik
                </ToggleGroupItem>
                <ToggleGroupItem className="text-xs" value="scroll" aria-label="Aylantirish rejimiga o'tish">
                  Dinamik
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Yon panel yig&apos;ish</Label>
              <ToggleGroup
                className="w-full"
                size="sm"
                variant="outline"
                type="single"
                value={collapsible}
                onValueChange={(value) => handleValueChange("sidebar_collapsible", value)}
              >
                <ToggleGroupItem className="text-xs" value="icon" aria-label="Belgi rejimga o'tish">
                  Belgi
                </ToggleGroupItem>
                <ToggleGroupItem className="text-xs" value="offcanvas" aria-label="Yashirin rejimga o'tish">
                  Yashirin
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Kontent joylashuvi</Label>
              <ToggleGroup
                className="w-full"
                size="sm"
                variant="outline"
                type="single"
                value={contentLayout}
                onValueChange={(value) => handleValueChange("content_layout", value)}
              >
                <ToggleGroupItem className="text-xs" value="centered" aria-label="Markazlashtirilganga o'tish">
                  Markazlashtirilgan
                </ToggleGroupItem>
                <ToggleGroupItem className="text-xs" value="full-width" aria-label="To'liq kenglikka o'tish">
                  To&apos;liq kenglik
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
