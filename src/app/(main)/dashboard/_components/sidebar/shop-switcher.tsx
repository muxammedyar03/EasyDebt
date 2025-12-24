"use client";

import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ShopSwitcherProps {
  currentShop: {
    id: number;
    name: string;
  } | null;
  role: string;
  needsSelection?: boolean;
}

export function ShopSwitcher({ currentShop, role, needsSelection }: ShopSwitcherProps) {
  const router = useRouter();
  const isSuperAdmin = role === "SUPER_ADMIN";

  // Admin/User - just display shop name
  if (!isSuperAdmin) {
    if (!currentShop) return null;

    return (
      <div className="border-border bg-card flex h-12 cursor-pointer items-center gap-2 rounded-md border px-3 text-base">
        <Building2 className="h-5 w-5" />
        <span className="font-bold uppercase">{currentShop.name}</span>
      </div>
    );
  }

  // Super Admin - clickable dropdown
  const handleChangeShop = () => {
    router.push("/change-shop");
  };

  return (
    <div
      onClick={needsSelection ? handleChangeShop : undefined}
      className="border-border flex h-12 w-full cursor-pointer items-center justify-between rounded-md border px-3"
    >
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5" />
        <span className="text-base font-bold uppercase">{currentShop ? currentShop.name : "Select Shop"}</span>
      </div>
    </div>
  );
}
