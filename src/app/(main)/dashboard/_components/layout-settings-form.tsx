"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { t } from "@/lib/i18n";
import { updateContentLayout, updateNavbarStyle } from "@/lib/layout-utils";
import { updateThemeMode, updateThemePreset } from "@/lib/theme-utils";
import { setValueToCookie } from "@/server/server-actions";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";
import type { SidebarVariant, SidebarCollapsible, ContentLayout, NavbarStyle } from "@/types/preferences/layout";
import { THEME_PRESET_OPTIONS, type ThemePreset, type ThemeMode } from "@/types/preferences/theme";

type LayoutSettingsFormProps = {
  variant: SidebarVariant;
  collapsible: SidebarCollapsible;
  contentLayout: ContentLayout;
  navbarStyle: NavbarStyle;
};

export function LayoutSettingsForm({ variant, collapsible, contentLayout, navbarStyle }: LayoutSettingsFormProps) {
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
    if (key === "content_layout") updateContentLayout(value as ContentLayout);
    if (key === "navbar_style") updateNavbarStyle(value as NavbarStyle);
    await setValueToCookie(key, value);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs font-medium">{t("layoutSettings.template")}</Label>
        <Select value={themePreset} onValueChange={(value) => handleValueChange("theme_preset", value)}>
          <SelectTrigger size="sm" className="w-full text-xs">
            <SelectValue placeholder={t("layoutSettings.template")} />
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
        <Label className="text-xs font-medium">{t("layoutSettings.mode")}</Label>
        <ToggleGroup
          className="w-full"
          size="sm"
          variant="outline"
          type="single"
          value={themeMode}
          onValueChange={(value) => value && handleValueChange("theme_mode", value)}
        >
          <ToggleGroupItem className="text-xs" value="light">
            {t("layoutSettings.modeLight")}
          </ToggleGroupItem>
          <ToggleGroupItem className="text-xs" value="dark">
            {t("layoutSettings.modeDark")}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium">{t("layoutSettings.sidebarType")}</Label>
        <ToggleGroup
          className="w-full"
          size="sm"
          variant="outline"
          type="single"
          value={variant}
          onValueChange={(value) => value && handleValueChange("sidebar_variant", value)}
        >
          <ToggleGroupItem className="text-xs" value="inset">
            {t("layoutSettings.sidebarInset")}
          </ToggleGroupItem>
          <ToggleGroupItem className="text-xs" value="sidebar">
            {t("layoutSettings.sidebarSide")}
          </ToggleGroupItem>
          <ToggleGroupItem className="text-xs" value="floating">
            {t("layoutSettings.sidebarFloating")}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium">{t("layoutSettings.navStyle")}</Label>
        <ToggleGroup
          className="w-full"
          size="sm"
          variant="outline"
          type="single"
          value={navbarStyle}
          onValueChange={(value) => value && handleValueChange("navbar_style", value)}
        >
          <ToggleGroupItem className="text-xs" value="sticky">
            {t("layoutSettings.navSticky")}
          </ToggleGroupItem>
          <ToggleGroupItem className="text-xs" value="scroll">
            {t("layoutSettings.navScroll")}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium">{t("layoutSettings.sidebarCollapse")}</Label>
        <ToggleGroup
          className="w-full"
          size="sm"
          variant="outline"
          type="single"
          value={collapsible}
          onValueChange={(value) => value && handleValueChange("sidebar_collapsible", value)}
        >
          <ToggleGroupItem className="text-xs" value="icon">
            {t("layoutSettings.collapseIcon")}
          </ToggleGroupItem>
          <ToggleGroupItem className="text-xs" value="offcanvas">
            {t("layoutSettings.collapseHidden")}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium">{t("layoutSettings.contentLayout")}</Label>
        <ToggleGroup
          className="w-full"
          size="sm"
          variant="outline"
          type="single"
          value={contentLayout}
          onValueChange={(value) => value && handleValueChange("content_layout", value)}
        >
          <ToggleGroupItem className="text-xs" value="centered">
            {t("layoutSettings.contentCentered")}
          </ToggleGroupItem>
          <ToggleGroupItem className="text-xs" value="full-width">
            {t("layoutSettings.contentFull")}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
