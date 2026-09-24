import { getPreference } from "@/server/server-actions";
import {
  CONTENT_LAYOUT_VALUES,
  NAVBAR_STYLE_VALUES,
  SIDEBAR_COLLAPSIBLE_VALUES,
  SIDEBAR_VARIANT_VALUES,
  type ContentLayout,
  type NavbarStyle,
  type SidebarCollapsible,
  type SidebarVariant,
} from "@/types/preferences/layout";

import { LayoutSettingsClient } from "./_components/layout-settings-client";

export default async function LayoutSettingsPage() {
  const [variant, collapsible, contentLayout, navbarStyle] = await Promise.all([
    getPreference<SidebarVariant>("sidebar_variant", SIDEBAR_VARIANT_VALUES, "sidebar"),
    getPreference<SidebarCollapsible>("sidebar_collapsible", SIDEBAR_COLLAPSIBLE_VALUES, "icon"),
    getPreference<ContentLayout>("content_layout", CONTENT_LAYOUT_VALUES, "centered"),
    getPreference<NavbarStyle>("navbar_style", NAVBAR_STYLE_VALUES, "scroll"),
  ]);

  return (
    <LayoutSettingsClient
      variant={variant}
      collapsible={collapsible}
      contentLayout={contentLayout}
      navbarStyle={navbarStyle}
    />
  );
}
