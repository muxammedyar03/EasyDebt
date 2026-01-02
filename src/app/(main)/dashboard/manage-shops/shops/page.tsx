"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Users,
  TrendingUp,
  Settings,
  Eye,
  Ban,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface Shop {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count: {
    users: number;
    debtors: number;
    debts: number;
    payments: number;
  };
  total_debt: number;
  total_payments: number;
  active_users: number;
  total_users: number;
}

export default function ShopManagementPage() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAccess();
    fetchShops();
  }, [statusFilter, checkAccess, fetchShops]);

  async function checkAccess() {
    // Check if user is SUPER_ADMIN
    const response = await fetch("/api/auth/me");
    if (response.ok) {
      const data = await response.json();
      if (data.user.role !== "SUPER_ADMIN") {
        toast.error("Access denied");
        router.push("/dashboard");
      }
    } else {
      router.push("/login");
    }
  }

  async function fetchShops() {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const response = await fetch(`/api/dashboard/shops?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch shops");
      }

      const data = await response.json();
      setShops(data.shops);
    } catch (error) {
      console.error("Error fetching shops:", error);
      toast.error("Failed to load shops");
    } finally {
      setLoading(false);
    }
  }

  const handleCreateNew = () => {
    setEditingShop(null);
    setFormData({
      name: "",
      address: "",
      phone: "",
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Shop name is required");
      return;
    }

    setSubmitting(true);

    try {
      const url = editingShop ? `/api/dashboard/shops/${editingShop.id}` : `/api/dashboard/shops`;

      const response = await fetch(url, {
        method: editingShop ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save shop");
      }

      toast.success(editingShop ? "Shop updated" : "Shop created");
      setDialogOpen(false);
      setEditingShop(null);
      setFormData({
        name: "",
        address: "",
        phone: "",
        is_active: true,
      });
      fetchShops();
    } catch (error) {
      console.error("Error saving shop:", error);
      toast.error(String(error) || "Failed to save shop");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (shop: Shop) => {
    try {
      const response = await fetch(`/api/dashboard/shops/${shop.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: !shop.is_active }),
      });

      if (!response.ok) {
        throw new Error("Failed to update shop status");
      }

      toast.success(shop.is_active ? "Shop deactivated" : "Shop activated");
      fetchShops();
    } catch (error) {
      console.error("Error updating shop:", error);
      toast.error("Failed to update shop status");
    }
  };

  const handleDelete = async (shop: Shop) => {
    if (!confirm(`Are you sure you want to delete "${shop.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/dashboard/shops/${shop.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete shop");
      }

      const result = await response.json();
      toast.success(result.message);
      fetchShops();
    } catch (error) {
      console.error("Error deleting shop:", error);
      toast.error("Failed to delete shop");
    }
  };

  const filteredShops = shops.filter(
    (shop) =>
      shop.name.toLowerCase().includes(search.toLowerCase()) ||
      shop.address?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary h-12 w-12 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shop Management</h1>
          <p className="text-muted-foreground mt-1">Manage all shops in the system</p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          New Shop
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shops</CardTitle>
            <Building2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shops.length}</div>
            <p className="text-muted-foreground text-xs">{shops.filter((s) => s.is_active).length} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shops.reduce((sum, shop) => sum + shop.total_users, 0)}</div>
            <p className="text-muted-foreground text-xs">
              {shops.reduce((sum, shop) => sum + shop.active_users, 0)} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debtors</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shops.reduce((sum, shop) => sum + shop._count.debtors, 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(shops.reduce((sum, shop) => sum + shop.total_debt, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
          <Input
            placeholder="Search shops..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
            autoComplete="off"
            name="search-shops"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {statusFilter === "all" ? "All" : statusFilter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Shops</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("active")}>Active Only</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>Inactive Only</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shop</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Users</TableHead>
              <TableHead className="text-center">Debtors</TableHead>
              <TableHead className="text-right">Total Debt</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredShops.map((shop) => (
              <TableRow key={shop.id}>
                <TableCell onClick={() => router.push(`/dashboard/manage-shops/shops/${shop.id}`)}>
                  <div className="cursor-pointer">
                    <div className="font-medium">{shop.name}</div>
                    {shop.address && <div className="text-muted-foreground text-sm">{shop.address}</div>}
                    {shop.phone && <div className="text-muted-foreground text-sm">{shop.phone}</div>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={shop.is_active ? "default" : "secondary"}>
                    {shop.is_active ? (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" /> Active
                      </>
                    ) : (
                      <>
                        <Ban className="mr-1 h-3 w-3" /> Inactive
                      </>
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div>
                    {shop.active_users}/{shop.total_users}
                  </div>
                </TableCell>
                <TableCell className="text-center">{shop._count.debtors}</TableCell>
                <TableCell className="text-right">{formatCurrency(shop.total_debt)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/manage-shops/shops/${shop.id}`)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/manage-shops/shops/${shop.id}/users`)}>
                        <Users className="mr-2 h-4 w-4" />
                        Manage Users
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingShop(shop);
                          setFormData({
                            name: shop.name,
                            address: shop.address || "",
                            phone: shop.phone || "",
                            is_active: shop.is_active,
                          });
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Shop
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(shop)}>
                        {shop.is_active ? (
                          <>
                            <Ban className="mr-2 h-4 w-4" /> Deactivate
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" /> Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDelete(shop)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Shop
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingShop ? "Edit Shop" : "Create New Shop"}</DialogTitle>
            <DialogDescription>
              {editingShop ? "Update shop information" : "Add a new shop to the system"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shop-name">Shop Name *</Label>
              <Input
                id="shop-name"
                name="shop-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter shop name"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shop-address">Address</Label>
              <Input
                id="shop-address"
                name="shop-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter shop address"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shop-phone">Phone</Label>
              <Input
                id="shop-phone"
                name="shop-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+998 90 123 45 67"
                autoComplete="off"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setEditingShop(null);
                setFormData({
                  name: "",
                  address: "",
                  phone: "",
                  is_active: true,
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving..." : editingShop ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
