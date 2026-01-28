"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserRole } from "@/types/types";

interface AuditLogFiltersProps {
  isMobile: boolean;
  role: UserRole;
}

export function AuditLogFilters({ isMobile, role }: AuditLogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);

  const [dateFrom, setDateFrom] = React.useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = React.useState(searchParams.get("dateTo") || "");
  const [allShops, setAllShops] = React.useState(searchParams.get("allShops") === "true");

  const [selectedActions, setSelectedActions] = React.useState<string[]>(
    searchParams.get("action")?.split(",").filter(Boolean) || [],
  );
  const [selectedEntityTypes, setSelectedEntityTypes] = React.useState<string[]>(
    searchParams.get("entityType")?.split(",").filter(Boolean) || [],
  );

  const handleActionToggle = (action: string) => {
    setSelectedActions((prev) => (prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]));
  };

  const handleEntityTypeToggle = (entityType: string) => {
    setSelectedEntityTypes((prev) =>
      prev.includes(entityType) ? prev.filter((e) => e !== entityType) : [...prev, entityType],
    );
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (selectedActions.length > 0) {
      params.set("action", selectedActions.join(","));
    } else {
      params.delete("action");
    }

    if (selectedEntityTypes.length > 0) {
      params.set("entityType", selectedEntityTypes.join(","));
    } else {
      params.delete("entityType");
    }

    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    } else {
      params.delete("dateFrom");
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    } else {
      params.delete("dateTo");
    }

    // All shops filter (only for SUPER_ADMIN)
    if (allShops) {
      params.set("allShops", "true");
    } else {
      params.delete("allShops");
    }

    params.set("page", "1");
    router.push(`?${params.toString()}`);
    if (isMobile) setOpen(false);
  };

  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedActions([]);
    setSelectedEntityTypes([]);
    setAllShops(false);
    router.push("/dashboard/audit-logs");
    if (isMobile) setOpen(false);
  };

  const FilterContent = () => (
    <div className="space-y-4">
      {/* Shop Filter */}
      {role === UserRole.SUPER_ADMIN && (
        <div className="space-y-2">
          <Label htmlFor="allShops">Shoplar</Label>
          <div className="border-border flex h-12 items-center space-x-2 rounded-md border p-2">
            <Checkbox id="allShops" checked={allShops} onCheckedChange={(checked) => setAllShops(checked === true)} />
            <label
              htmlFor="allShops"
              className="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Barcha shoplar
            </label>
          </div>
          {!allShops && <p className="text-muted-foreground text-xs">Faqat joriy shop harakatlari ko&apos;rsatiladi</p>}
        </div>
      )}
      {/* Date From */}
      <div className="space-y-2">
        <Label htmlFor="dateFrom">Boshlanish sanasi</Label>
        <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
      </div>

      {/* Date To */}
      <div className="space-y-2">
        <Label htmlFor="dateTo">Tugash sanasi</Label>
        <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      {/* Action Filter */}
      <div className="space-y-3">
        <Label>Harakat turi</Label>
        <div className="border-border h-32 overflow-y-scroll rounded-md border">
          {[
            { value: "CREATE", label: "Yaratish" },
            { value: "UPDATE", label: "Yangilash" },
            { value: "DELETE", label: "O'chirish" },
            { value: "LOGIN", label: "Kirish" },
            { value: "LOGOUT", label: "Chiqish" },
            { value: "EXPORT", label: "Export" },
            { value: "IMPORT", label: "Import" },
          ].map((action) => (
            <div key={action.value} className="flex h-8 items-center space-x-2 border-b px-2">
              <Checkbox
                id={`action-${action.value}`}
                checked={selectedActions.includes(action.value)}
                onCheckedChange={() => handleActionToggle(action.value)}
              />
              <label
                htmlFor={`action-${action.value}`}
                className="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {action.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Entity Type Filter */}
      <div className="space-y-3">
        <Label>Entity turi</Label>
        <div className="border-border h-32 overflow-y-scroll rounded-md border">
          {[
            { value: "DEBTOR", label: "Qarzdor" },
            { value: "DEBT", label: "Qarz" },
            { value: "PAYMENT", label: "To'lov" },
            { value: "USER", label: "Foydalanuvchi" },
            { value: "SETTINGS", label: "Sozlamalar" },
          ].map((entityType) => (
            <div key={entityType.value} className="flex h-8 items-center space-x-2 border-b px-2">
              <Checkbox
                id={`entity-${entityType.value}`}
                checked={selectedEntityTypes.includes(entityType.value)}
                onCheckedChange={() => handleEntityTypeToggle(entityType.value)}
              />
              <label
                htmlFor={`entity-${entityType.value}`}
                className="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {entityType.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 pt-2">
        <Button onClick={applyFilters} className="w-full">
          Filterni qo&apos;llash
        </Button>
        <Button onClick={handleClearFilters} variant="outline" className="w-full">
          <X className="mr-2 h-4 w-4" />
          Tozalash
        </Button>
      </div>
    </div>
  );

  // Mobile/Tablet - Dialog
  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="default" size="sm" className="bg-primary h-12">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filterlar</DialogTitle>
          </DialogHeader>
          <FilterContent />
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop 2xl+ - Sidebar Card
  return (
    <Card className="p-4">
      <CardHeader className="p-0">
        <CardTitle className="flex items-center gap-2 p-0 pt-2">
          <Filter className="h-5 w-5" />
          Filterlar
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <FilterContent />
      </CardContent>
    </Card>
  );
}
