"use client";

import { useEffect, useState, useMemo } from "react";
import {
  User as UserIcon,
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
  Users,
  TrendingUp,
  Wallet,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { useShopUsersStore } from "@/stores/shop-users-store";
import { shopUsersService } from "@/services/shop-users-service";
import { ShopUser, UserRole } from "@/types/types";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ShopStats {
  todayDebts: number;
  todayPayments: number;
  totalDebt: number;
  totalPayments: number;
  activeUsers: number;
  totalUsers: number;
  debtorsCount: number;
}

interface ShopUsersContentProps {
  shopId: number;
  handleCreateEdit: (user: ShopUser | null) => void;
}

export default function ShopUsersContent({ shopId, handleCreateEdit }: ShopUsersContentProps) {
  const { users, loading, updateUser, removeUser, fetchUsers, reset } = useShopUsersStore();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "BLOCKED" | "DEACTIVATED">("all");
  const [stats, setStats] = useState<ShopStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchUsers(shopId);
    fetchStats(shopId);
    return () => reset();
  }, [shopId, fetchUsers, reset]);

  const fetchStats = async (id: number) => {
    try {
      const response = await fetch(`/api/dashboard/shops/${id}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoadingStats(false);
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
    let filtered = users;

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.username.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.first_name?.toLowerCase().includes(searchLower) ||
          user.last_name?.toLowerCase().includes(searchLower),
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.status === statusFilter);
    }

    return filtered;
  }, [users, search, roleFilter, statusFilter]);

  // Chart data - MUST be before conditional return
  const chartData = useMemo(() => {
    if (!stats) return [];
    return [
      {
        name: "Bugun",
        Qarzlar: stats.todayDebts,
        "To'lovlar": stats.todayPayments,
      },
      {
        name: "Jami",
        Qarzlar: stats.totalDebt,
        "To'lovlar": stats.totalPayments,
      },
    ];
  }, [stats]);

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
    <div className="w-full">
      {/* Shop Info & Stats */}
      {!loadingStats && stats && (
        <>
          {/* Stats Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bugungi Qarzlar</CardTitle>
                <TrendingUp className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.todayDebts)}</div>
                <p className="text-muted-foreground text-xs">Bugun qo&apos;shilgan</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bugungi To&apos;lovlar</CardTitle>
                <Wallet className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.todayPayments)}</div>
                <p className="text-muted-foreground text-xs">Bugun to&apos;langan</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Qarzdorlar</CardTitle>
                <Users className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.debtorsCount}</div>
                <p className="text-muted-foreground text-xs">Jami qarzdorlar</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Foydalanuvchilar</CardTitle>
                <UserIcon className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.activeUsers}/{stats.totalUsers}
                </div>
                <p className="text-muted-foreground text-xs">Faol / Jami</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Qarzlar va To&apos;lovlar Diagrammasi</CardTitle>
              <CardDescription>Bugungi va umumiy statistika</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="Qarzlar" fill="#ef4444" />
                  <Bar dataKey="To'lovlar" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* Users Section */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Foydalanuvchilar</h2>
        <p className="text-muted-foreground text-sm">Do&apos;kon foydalanuvchilarini boshqarish</p>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
          <Input
            placeholder="Qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Rol: {roleFilter === "all" ? "Hammasi" : roleFilter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setRoleFilter("all")}>Hammasi</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoleFilter(UserRole.ADMIN)}>Admin</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoleFilter(UserRole.USER)}>User</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Status: {statusFilter === "all" ? "Hammasi" : statusFilter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>Hammasi</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("ACTIVE")}>Active</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("BLOCKED")}>Blocked</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("DEACTIVATED")}>Deactivated</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
    </div>
  );
}
