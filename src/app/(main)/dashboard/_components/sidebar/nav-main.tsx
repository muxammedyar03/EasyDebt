"use client";

import * as React from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { ChevronRight, Loader2 } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { type NavGroup, type NavMainItem } from "@/navigation/sidebar/sidebar-items";
import { useCurrentUser } from "@/hooks/use-current-user";

/** Link status follows the actual App Router transition and clears on completion/error. */
function PendingIndicator() {
  const { pending } = useLinkStatus();
  const t = useTranslations("common");
  if (!pending) return null;
  return (
    <span role="status" aria-live="polite" className="ml-auto inline-flex items-center">
      <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
      <span className="sr-only">{t("loading")}</span>
    </span>
  );
}

const PendingLink = React.forwardRef<HTMLAnchorElement, React.ComponentProps<typeof Link>>(function PendingLink(
  { children, ...props },
  ref,
) {
  return (
    <Link {...props} ref={ref}>
      {children}
      <PendingIndicator />
    </Link>
  );
});

interface NavMainProps {
  readonly items: readonly NavGroup[];
  readonly allowedPermissions?: readonly string[];
}

const IsComingSoon = () => {
  const t = useTranslations("common");
  return <span className="ml-auto rounded-md bg-gray-200 px-2 py-1 text-xs dark:text-gray-800">{t("soon")}</span>;
};

const NavItemExpanded = ({
  item,
  isActive,
  isSubmenuOpen,
  label,
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
  isSubmenuOpen: (subItems?: NavMainItem["subItems"]) => boolean;
  label: string;
}) => {
  const { isMobile, setOpenMobile } = useSidebar();
  const t = useTranslations();
  const disabled = item.comingSoon;
  return (
    <Collapsible key={item.title} asChild defaultOpen={isSubmenuOpen(item.subItems)} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          {item.subItems ? (
            <SidebarMenuButton disabled={disabled} isActive={isActive(item.url, item.subItems)} tooltip={label}>
              {item.icon && <item.icon />}
              <span>{label}</span>
              {item.comingSoon && <IsComingSoon />}
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          ) : (
            <SidebarMenuButton asChild aria-disabled={item.comingSoon} isActive={isActive(item.url)} tooltip={label}>
              <PendingLink
                href={item.url}
                target={item.newTab ? "_blank" : undefined}
                onClick={() => {
                  if (isMobile) setOpenMobile(false);
                }}
              >
                {item.icon && <item.icon />}
                <span>{label}</span>
                {item.comingSoon && <IsComingSoon />}
              </PendingLink>
            </SidebarMenuButton>
          )}
        </CollapsibleTrigger>
        {item.subItems && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.subItems.map((subItem) => (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton aria-disabled={subItem.comingSoon} isActive={isActive(subItem.url)} asChild>
                    <PendingLink
                      href={subItem.url}
                      target={subItem.newTab ? "_blank" : undefined}
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      {subItem.icon && <subItem.icon />}
                      <span>{t(subItem.title)}</span>
                      {subItem.comingSoon && <IsComingSoon />}
                    </PendingLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
};

const NavItemCollapsed = ({
  item,
  isActive,
  label,
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
  label: string;
}) => {
  const t = useTranslations();
  const disabled = item.comingSoon;
  return (
    <SidebarMenuItem key={item.title}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton disabled={disabled} tooltip={label} isActive={isActive(item.url, item.subItems)}>
            {item.icon && <item.icon />}
            <span>{label}</span>
            <ChevronRight />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-50 space-y-1" side="right" align="start">
          {item.subItems?.map((subItem) => (
            <DropdownMenuItem key={subItem.title} asChild>
              <SidebarMenuSubButton
                key={subItem.title}
                asChild
                className="focus-visible:ring-0"
                aria-disabled={subItem.comingSoon}
                isActive={isActive(subItem.url)}
              >
                <PendingLink href={subItem.url} target={subItem.newTab ? "_blank" : undefined}>
                  {subItem.icon && <subItem.icon className="[&>svg]:text-sidebar-foreground" />}
                  <span>{t(subItem.title)}</span>
                  {subItem.comingSoon && <IsComingSoon />}
                </PendingLink>
              </SidebarMenuSubButton>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export function NavMain({ items, allowedPermissions = [] }: NavMainProps) {
  const pathname = usePathname();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { user } = useCurrentUser();
  const t = useTranslations();

  const path = pathname ?? "";
  const isItemActive = (url: string, subItems?: NavMainItem["subItems"]) => {
    if (subItems?.length) {
      return subItems.some((sub) => path.startsWith(sub.url));
    }
    return path === url;
  };

  const isSubmenuOpen = (subItems?: NavMainItem["subItems"]) => {
    return subItems?.some((sub) => path.startsWith(sub.url)) ?? false;
  };

  const filteredItems: NavGroup[] = React.useMemo(() => {
    const permissions = allowedPermissions ?? [];
    return items
      .map((group: NavGroup) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            (item.permission != null || !item.roles?.length || (user != null && item.roles.includes(user.role))) &&
            (!item.permission || permissions.includes(item.permission)),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [items, user, allowedPermissions]);

  return (
    <>
      {filteredItems.map((group) => (
        <SidebarGroup key={group.id}>
          {group.label ? (
            <SidebarGroupLabel className="text-primary mb-0.5 px-2 text-[11px] font-semibold tracking-wide uppercase">
              {t(group.label)}
            </SidebarGroupLabel>
          ) : null}
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {group.items.map((item) => {
                const label = t(item.title);
                if (state === "collapsed" && !isMobile) {
                  if (!item.subItems) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          aria-disabled={item.comingSoon}
                          tooltip={label}
                          isActive={isItemActive(item.url)}
                        >
                          <PendingLink
                            href={item.url}
                            target={item.newTab ? "_blank" : undefined}
                            onClick={() => {
                              if (isMobile) setOpenMobile(false);
                            }}
                          >
                            {item.icon && <item.icon className="md:!h-5 md:!w-5" />}
                            <span>{label}</span>
                          </PendingLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                  return <NavItemCollapsed key={item.title} item={item} isActive={isItemActive} label={label} />;
                }
                return (
                  <NavItemExpanded
                    key={item.title}
                    item={item}
                    isActive={isItemActive}
                    isSubmenuOpen={isSubmenuOpen}
                    label={label}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
