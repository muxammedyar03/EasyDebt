"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Edit, Edit2, Plus, Save, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import ShopUsersContent from "./users/_components/shop-users-content";
import { ShopUser, UserRole, UserFormData } from "@/types/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { shopUsersService } from "@/services/shop-users-service";
import { useShopUsersStore } from "@/stores/shop-users-store";

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

const INITIAL_USER_FORM_DATA: UserFormData = {
  username: "",
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  role: UserRole.USER,
  status: "ACTIVE",
};

export default function ShopDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const shopId = parseInt(params.id as string);

  const { updateUser, fetchUsers } = useShopUsersStore();

  const [shop, setShop] = useState<Shop | null>(null);
  const [editingUser, setEditingUser] = useState<ShopUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shopFormData, setShopFormData] = useState({
    name: "",
    address: "",
    phone: "",
    is_active: true,
  });

  // User dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userFormData, setUserFormData] = useState<UserFormData>(INITIAL_USER_FORM_DATA);
  const [submitting, setSubmitting] = useState(false);

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
      setShopFormData({
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
    if (!shopFormData.name) {
      toast.error("Shop name is required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/dashboard/shops/${shopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shopFormData),
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
      setShopFormData({
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
      <div className="container mx-auto max-w-7xl p-6">
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
      <div className="container mx-auto max-w-7xl p-6">
        <div className="py-12 text-center">
          <h1 className="mb-2 text-2xl font-bold">Shop not found</h1>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const handleCreateEdit = (user: ShopUser | null = null): void => {
    setEditingUser(user);
    if (user) {
      setUserFormData({
        username: user.username,
        email: user.email || "",
        password: "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        role: user.role,
        status: user.status,
      });
    } else {
      setUserFormData(INITIAL_USER_FORM_DATA);
    }
    setDialogOpen(true);
  };

  const handleUserSubmit = async (): Promise<void> => {
    if (!userFormData.username.trim()) {
      toast.error("Username is required");
      return;
    }

    if (!editingUser && !userFormData.password) {
      toast.error("Password is required for new users");
      return;
    }

    setSubmitting(true);

    try {
      if (editingUser) {
        const updateData: Partial<UserFormData> = {
          email: userFormData.email,
          first_name: userFormData.first_name,
          last_name: userFormData.last_name,
          role: userFormData.role,
          status: userFormData.status,
        };

        if (userFormData.password) {
          updateData.password = userFormData.password;
        }

        await shopUsersService.updateUser(editingUser.id, updateData);
        updateUser(editingUser.id, updateData);
        toast.success("User updated successfully");
      } else {
        await shopUsersService.createUser(shopId, userFormData);
        toast.success("User created successfully");
        await fetchUsers(shopId);
      }

      setDialogOpen(false);
      setUserFormData(INITIAL_USER_FORM_DATA);
      setEditingUser(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save user";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{shop.name}</h1>
            <p className="text-muted-foreground mt-1">Do&apos;kon boshqaruvi va foydalanuvchilar</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Tahrirlash
          </Button>
          <Button onClick={() => handleCreateEdit(null)}>
            <Plus className="mr-2 h-4 w-4" />
            Foydalanuvchi qo&apos;shish
          </Button>
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
              Tahrirlash
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Shop Name */}
          <div className="space-y-2">
            <Label htmlFor="shop-name">Shop Name</Label>
            <Input
              id="shop-name"
              value={shopFormData.name}
              onChange={(e) => setShopFormData({ ...shopFormData, name: e.target.value })}
              disabled={!editing}
              placeholder="Enter shop name"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="shop-address">Address</Label>
            <Input
              id="shop-address"
              value={shopFormData.address}
              onChange={(e) => setShopFormData({ ...shopFormData, address: e.target.value })}
              disabled={!editing}
              placeholder="Enter shop address"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="shop-phone">Phone</Label>
            <Input
              id="shop-phone"
              value={shopFormData.phone}
              onChange={(e) => setShopFormData({ ...shopFormData, phone: e.target.value })}
              disabled={!editing}
              placeholder="+998 90 123 45 67"
            />
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <Label htmlFor="shop-status">Active Status</Label>
            <Switch
              id="shop-status"
              checked={shopFormData.is_active}
              onCheckedChange={(checked) => setShopFormData({ ...shopFormData, is_active: checked })}
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

      <ShopUsersContent shopId={shop.id} handleCreateEdit={handleCreateEdit} />

      {/* Create/Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Update user information" : "Add a new user to this shop"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={userFormData.username}
                onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                placeholder="Enter username"
                disabled={!!editingUser}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={userFormData.first_name}
                  onChange={(e) => setUserFormData({ ...userFormData, first_name: e.target.value })}
                  placeholder="First name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={userFormData.last_name}
                  onChange={(e) => setUserFormData({ ...userFormData, last_name: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password {editingUser ? "(leave empty to keep current)" : "*"}</Label>
              <Input
                id="password"
                type="password"
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                placeholder={editingUser ? "Leave empty to keep current" : "Enter password"}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={userFormData.role}
                  onValueChange={(value) => setUserFormData({ ...userFormData, role: value as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                    <SelectItem value={UserRole.USER}>User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={userFormData.status}
                  onValueChange={(value) =>
                    setUserFormData({ ...userFormData, status: value as "ACTIVE" | "BLOCKED" | "DEACTIVATED" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="BLOCKED">Blocked</SelectItem>
                    <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUserSubmit} disabled={submitting}>
              {submitting ? "Saving..." : editingUser ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
