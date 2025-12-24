"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Edit2, Save, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Shop {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_users?: number;
  total_debtors?: number;
  total_debt?: number;
}

export default function ShopDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const shopId = parseInt(params.id as string);

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    is_active: true,
  });

  useEffect(() => {
    fetchShop();
  }, [shopId]);

  const fetchShop = async () => {
    try {
      const response = await fetch(`/api/dashboard/shops?id=${shopId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch shop");
      }
      const data = await response.json();
      const shopData = data.shops?.find((s: Shop) => s.id === shopId) || data;
      setShop(shopData);
      setFormData({
        name: shopData.name,
        address: shopData.address || "",
        phone: shopData.phone || "",
        is_active: shopData.is_active,
      });
    } catch (error) {
      console.error("Error fetching shop:", error);
      toast.error("Failed to load shop details");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Shop name is required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/dashboard/shops/${shopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update shop");
      }

      const updated = await response.json();
      setShop(updated);
      setEditing(false);
      toast.success("Shop updated successfully");
    } catch (error) {
      console.error("Error updating shop:", error);
      toast.error(String(error) || "Failed to update shop");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (shop) {
      setFormData({
        name: shop.name,
        address: shop.address || "",
        phone: shop.phone || "",
        is_active: shop.is_active,
      });
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="mb-6">
          <Skeleton className="mb-2 h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton className="mb-2 h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="container mx-auto max-w-4xl p-6">
        <div className="py-12 text-center">
          <h1 className="mb-2 text-2xl font-bold">Shop not found</h1>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{shop.name}</h1>
          <p className="text-muted-foreground mt-1">Shop details and information</p>
        </div>
      </div>

      {/* Main Details Card */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Shop Information</CardTitle>
            <CardDescription>{editing ? "Edit shop details" : "View shop details"}</CardDescription>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Shop Name */}
          <div className="space-y-2">
            <Label htmlFor="shop-name">Shop Name</Label>
            <Input
              id="shop-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!editing}
              placeholder="Enter shop name"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="shop-address">Address</Label>
            <Input
              id="shop-address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={!editing}
              placeholder="Enter shop address"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="shop-phone">Phone</Label>
            <Input
              id="shop-phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={!editing}
              placeholder="+998 90 123 45 67"
            />
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <Label htmlFor="shop-status">Active Status</Label>
            <Switch
              id="shop-status"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              disabled={!editing}
            />
          </div>

          {/* Created Date */}
          <div className="space-y-2">
            <Label>Created Date</Label>
            <div className="text-muted-foreground text-sm">
              {new Date(shop.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>

          {/* Action Buttons */}
          {editing && (
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={saving} className="flex-1">
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {shop.total_users !== undefined && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{shop.total_users}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Debtors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{shop.total_debtors}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{shop.total_debt?.toLocaleString()} so&apos;m</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
