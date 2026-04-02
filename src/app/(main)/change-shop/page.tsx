"use client";

import { useEffect, useState } from "react";
import { redirect, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, TrendingUp, Check } from "lucide-react";
import { toast } from "sonner";
import { formatCurrencyUzs } from "@/lib/format";

interface Shop {
  id: number;
  name: string;
  is_active: boolean;
  address: string | null;
  phone: string | null;
  _count: {
    users: number;
    debtors: number;
  };
  total_debt: number;
  is_current: boolean;
}

export default function ChangeShopPage() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [currentShopId, setCurrentShopId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<number | null>(null);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  if (shops.length === 0) {
    redirect("/dashboard");
  }

  async function fetchShops() {
    try {
      const response = await fetch("/api/auth/change-shop");

      if (response.status === 403) {
        toast.error("Access denied. Only Super Admin can switch shops.");
        router.push("/dashboard");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch shops");
      }

      const data = await response.json();
      setShops(data.shops);
      setCurrentShopId(data.current_shop_id);
    } catch (error) {
      console.error("Error fetching shops:", error);
      toast.error("Failed to load shops");
    } finally {
      setLoading(false);
    }
  }

  const handleShopChange = async (shopId: number) => {
    if (shopId === currentShopId) {
      toast.info("You are already in this shop");
      return;
    }

    setSwitching(shopId);

    try {
      const response = await fetch("/api/auth/change-shop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shopId }),
      });

      if (!response.ok) {
        throw new Error("Failed to switch shop");
      }

      const data = await response.json();

      if (data.warning) {
        toast.warning(data.warning);
      } else {
        toast.success(`Switched to ${data.shop.name}`);
      }

      // Refresh the page to reload with new context
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Error switching shop:", error);
      toast.error("Failed to switch shop");
    } finally {
      setSwitching(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary h-12 w-12 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Select Shop</h1>
        <p className="text-muted-foreground mt-2">Choose which shop you want to manage</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {shops.map((shop) => (
          <Card
            key={shop.id}
            className={`relative transition-all hover:shadow-lg ${!shop.is_active ? "opacity-60" : ""} ${
              shop.is_current ? "ring-primary ring-2" : ""
            }`}
          >
            {shop.is_current && (
              <Badge className="absolute top-4 right-4" variant="default">
                <Check className="mr-1 h-3 w-3" />
                Current
              </Badge>
            )}

            {!shop.is_active && (
              <Badge className="absolute top-4 right-4" variant="destructive">
                Inactive
              </Badge>
            )}

            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {shop.name}
              </CardTitle>
              {shop.address && <CardDescription>{shop.address}</CardDescription>}
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Users
                  </span>
                  <span className="font-medium">{shop._count.users}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Debtors
                  </span>
                  <span className="font-medium">{shop._count.debtors}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Total Debt
                  </span>
                  <span className="font-medium">{formatCurrencyUzs(shop.total_debt)}</span>
                </div>
              </div>

              <Button
                className="mt-4 w-full"
                onClick={() => handleShopChange(shop.id)}
                disabled={switching === shop.id || shop.is_current}
                variant={shop.is_current ? "outline" : "default"}
              >
                {switching === shop.id ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                    Switching...
                  </>
                ) : shop.is_current ? (
                  "Current Shop"
                ) : (
                  "Switch to this shop"
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {shops.length === 0 && (
        <Card className="py-12 text-center">
          <CardContent>
            <p className="text-muted-foreground">No shops available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
