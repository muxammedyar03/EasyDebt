"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  User as UserIcon,
  Plus,
  Search,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  AlertCircle,
  Shield,
  UserCheck,
  Lock,
  Mail,
  MoreVertical,
} from "lucide-react";
import { Card } from "@/components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { useShopUsersStore } from "@/stores/shop-users-store";
import { shopUsersService } from "@/services/shop-users-service";
import { ShopUser, UserRole, UserFormData } from "@/types/types";

const INITIAL_FORM_DATA: UserFormData = {
  username: "",
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  role: UserRole.USER,
  status: "ACTIVE",
};

export default function ShopUsersPage() {
  const params = useParams();
  const shopId = parseInt(params.id as string);
  const { shop, users, loading, updateUser, removeUser, fetchUsers, reset } = useShopUsersStore();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ShopUser | null>(null);
  const [formData, setFormData] = useState<UserFormData>(INITIAL_FORM_DATA);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers(shopId);
    return () => reset();
  }, [shopId, fetchUsers, reset]);

  const handleCreateEdit = (user: ShopUser | null = null): void => {
    setEditingUser(user);
    if (user) {
      setFormData({
        username: user.username,
        email: user.email || "",
        password: "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        role: user.role,
        status: user.status,
      });
    } else {
      setFormData(INITIAL_FORM_DATA);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!formData.username.trim()) {
      toast.error("Username is required");
      return;
    }

    if (!editingUser && !formData.password) {
      toast.error("Password is required for new users");
      return;
    }

    setSubmitting(true);

    try {
      if (editingUser) {
        const updateData: Partial<UserFormData> = {
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          status: formData.status,
        };

        if (formData.password) {
          updateData.password = formData.password;
        }

        await shopUsersService.updateUser(editingUser.id, updateData);
        updateUser(editingUser.id, updateData);
        toast.success("User updated successfully");
      } else {
        await shopUsersService.createUser(shopId, formData);
        toast.success("User created successfully");
        await fetchUsers(shopId);
      }

      setDialogOpen(false);
      setFormData(INITIAL_FORM_DATA);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save user";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: ShopUser, newStatus: "ACTIVE" | "BLOCKED" | "DEACTIVATED"): Promise<void> => {
    try {
      await shopUsersService.updateUserStatus(user.id, newStatus);
      updateUser(user.id, { status: newStatus });

      const statusText = newStatus === "ACTIVE" ? "activated" : newStatus === "BLOCKED" ? "blocked" : "deactivated";
      toast.success(`User ${statusText}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update user status";
      toast.error(message);
    }
  };

  const handleResetPassword = async (user: ShopUser): Promise<void> => {
    const newPassword = prompt(`Enter new password for ${user.username}`);

    if (!newPassword) return;

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      await shopUsersService.resetPassword(user.id, newPassword);
      toast.success("Password reset successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reset password";
      toast.error(message);
    }
  };

  const handleDelete = async (user: ShopUser): Promise<void> => {
    const confirmed = window.confirm(`Are you sure you want to delete "${user.username}"?`);

    if (!confirmed) return;

    try {
      const result = await shopUsersService.deleteUser(user.id);
      removeUser(user.id);
      toast.success(result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete user";
      toast.error(message);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;

    const searchLower = search.toLowerCase();
    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.first_name?.toLowerCase().includes(searchLower) ||
        user.last_name?.toLowerCase().includes(searchLower),
    );
  }, [users, search]);

  const getRoleBadge = (role: UserRole) => {
    const config = {
      [UserRole.SUPER_ADMIN]: { variant: "destructive" as const, icon: Shield },
      [UserRole.ADMIN]: { variant: "default" as const, icon: UserCheck },
      [UserRole.USER]: { variant: "secondary" as const, icon: UserIcon },
    };

    const { variant, icon: Icon } = config[role];

    return (
      <Badge variant={variant}>
        <Icon className="mr-1 h-3 w-3" />
        {role}
      </Badge>
    );
  };

  const getStatusBadge = (status: "ACTIVE" | "BLOCKED" | "DEACTIVATED") => {
    const config = {
      ACTIVE: { variant: "default" as const, icon: CheckCircle },
      BLOCKED: { variant: "destructive" as const, icon: Ban },
      DEACTIVATED: { variant: "secondary" as const, icon: AlertCircle },
    };

    const { variant, icon: Icon } = config[status];

    return (
      <Badge variant={variant}>
        <Icon className="mr-1 h-3 w-3" />
        {status}
      </Badge>
    );
  };

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
          <h1 className="text-3xl font-bold">{shop?.name} - Users</h1>
          <p className="text-muted-foreground mt-1">Manage users in this shop</p>
        </div>
        <Button onClick={() => handleCreateEdit(null)}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Activity</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{user.username}</div>
                    {user.first_name && user.last_name && (
                      <div className="text-muted-foreground text-sm">
                        {user.first_name} {user.last_name}
                      </div>
                    )}
                    {user.email && (
                      <div className="text-muted-foreground flex items-center text-sm">
                        <Mail className="mr-1 h-3 w-3" />
                        {user.email}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getRoleBadge(user.role)}</TableCell>
                <TableCell>{getStatusBadge(user.status)}</TableCell>
                <TableCell className="text-center">
                  <div className="text-sm">
                    <div>Debtors: {user._count?.created_debtors ?? 0}</div>
                    <div>Debts: {user._count?.created_debts ?? 0}</div>
                    <div>Payments: {user._count?.created_payments ?? 0}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {user.last_activity ? (
                    <div className="text-sm">
                      <div className="font-medium">{user.last_activity.action}</div>
                      <div className="text-muted-foreground">
                        {format(user.last_activity.created_at, "dd/MM/yyyy HH:mm")}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No activity</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleCreateEdit(user)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                        <Lock className="mr-2 h-4 w-4" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {user.status === "ACTIVE" ? (
                        <>
                          <DropdownMenuItem onClick={() => handleToggleStatus(user, "BLOCKED")}>
                            <Ban className="mr-2 h-4 w-4" />
                            Block User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(user, "DEACTIVATED")}>
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Deactivate User
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem onClick={() => handleToggleStatus(user, "ACTIVE")}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Activate User
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDelete(user)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete User
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
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter username"
                disabled={!!editingUser}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="First name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password {editingUser ? "(leave empty to keep current)" : "*"}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? "Leave empty to keep current" : "Enter password"}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
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
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as "ACTIVE" | "BLOCKED" | "DEACTIVATED" })
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
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving..." : editingUser ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
