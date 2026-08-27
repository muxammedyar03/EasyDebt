"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { PlusCircleIcon, MailIcon, ChevronRight, UserPlus, Banknote, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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

interface NavMainProps {
  readonly items: readonly NavGroup[];
}

const IsComingSoon = () => {
  const t = useTranslations("common");
  return <span className="ml-auto rounded-md bg-gray-200 px-2 py-1 text-xs dark:text-gray-800">{t("soon")}</span>;
};

const NavItemExpanded = ({
  item,
  isActive,
  isSubmenuOpen,
  roleDisabled,
  label,
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
  isSubmenuOpen: (subItems?: NavMainItem["subItems"]) => boolean;
  roleDisabled?: boolean;
  label: string;
}) => {
  const { isMobile, setOpenMobile } = useSidebar();
  const t = useTranslations();
  const disabled = item.comingSoon || roleDisabled;
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
          ) : roleDisabled ? (
            <SidebarMenuButton disabled tooltip={label} isActive={false}>
              {item.icon && <item.icon />}
              <span>{label}</span>
              {item.comingSoon && <IsComingSoon />}
            </SidebarMenuButton>
          ) : (
            <SidebarMenuButton asChild aria-disabled={item.comingSoon} isActive={isActive(item.url)} tooltip={label}>
              <Link
                href={item.url}
                target={item.newTab ? "_blank" : undefined}
                onClick={() => {
                  if (isMobile) setOpenMobile(false);
                }}
              >
                {item.icon && <item.icon />}
                <span>{label}</span>
                {item.comingSoon && <IsComingSoon />}
              </Link>
            </SidebarMenuButton>
          )}
        </CollapsibleTrigger>
        {item.subItems && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.subItems.map((subItem) => (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton aria-disabled={subItem.comingSoon} isActive={isActive(subItem.url)} asChild>
                    <Link
                      href={subItem.url}
                      target={subItem.newTab ? "_blank" : undefined}
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      {subItem.icon && <subItem.icon />}
                      <span>{t(subItem.title)}</span>
                      {subItem.comingSoon && <IsComingSoon />}
                    </Link>
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
  roleDisabled,
  label,
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
  roleDisabled?: boolean;
  label: string;
}) => {
  const t = useTranslations();
  const disabled = item.comingSoon || roleDisabled;
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
                <Link href={subItem.url} target={subItem.newTab ? "_blank" : undefined}>
                  {subItem.icon && <subItem.icon className="[&>svg]:text-sidebar-foreground" />}
                  <span>{t(subItem.title)}</span>
                  {subItem.comingSoon && <IsComingSoon />}
                </Link>
              </SidebarMenuSubButton>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export function NavMain({ items }: NavMainProps) {
  const pathname = usePathname();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const [quickCreateOpen, setQuickCreateOpen] = React.useState(false);
  const { user } = useCurrentUser();
  const t = useTranslations();
  const tNav = useTranslations("nav");

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
    return items.map((group: NavGroup) => ({
      ...group,
      items: group.items,
    }));
  }, [items]);

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent className="flex flex-col gap-2">
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center gap-2">
              <DropdownMenu open={quickCreateOpen} onOpenChange={setQuickCreateOpen}>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    tooltip={tNav("quickCreate")}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
                  >
                    <PlusCircleIcon />
                    <span>{tNav("quickCreate")}</span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/default"
                      className="flex cursor-pointer items-center gap-2"
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>{tNav("addDebtor")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/debtors"
                      className="flex cursor-pointer items-center gap-2"
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      <Banknote className="h-4 w-4" />
                      <span>{tNav("addDebt")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/debtors"
                      className="flex cursor-pointer items-center gap-2"
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>{tNav("addPayment")}</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="icon"
                className="h-9 w-9 shrink-0 group-data-[collapsible=icon]:opacity-0"
                variant="outline"
              >
                <MailIcon />
                <span className="sr-only">Inbox</span>
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      {filteredItems.map((group) => (
        <SidebarGroup key={group.id}>
          {group.label && <SidebarGroupLabel>{t(group.label)}</SidebarGroupLabel>}
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {group.items.map((item) => {
                const roleDisabled = Boolean(item.roles?.length && (!user || !item.roles.includes(user.role)));
                const label = t(item.title);
                if (state === "collapsed" && !isMobile) {
                  if (!item.subItems) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        {roleDisabled ? (
                          <SidebarMenuButton disabled tooltip={label} isActive={false}>
                            {item.icon && <item.icon className="md:!h-5 md:!w-5" />}
                            <span>{label}</span>
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton
                            asChild
                            aria-disabled={item.comingSoon}
                            tooltip={label}
                            isActive={isItemActive(item.url)}
                          >
                            <Link
                              href={item.url}
                              target={item.newTab ? "_blank" : undefined}
                              onClick={() => {
                                if (isMobile) setOpenMobile(false);
                              }}
                            >
                              {item.icon && <item.icon className="md:!h-5 md:!w-5" />}
                              <span>{label}</span>
                            </Link>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    );
                  }
                  return (
                    <NavItemCollapsed
                      key={item.title}
                      item={item}
                      isActive={isItemActive}
                      roleDisabled={roleDisabled}
                      label={label}
                    />
                  );
                }
                return (
                  <NavItemExpanded
                    key={item.title}
                    item={item}
                    isActive={isItemActive}
                    isSubmenuOpen={isSubmenuOpen}
                    roleDisabled={roleDisabled}
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
