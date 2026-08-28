"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, UserCheck, UserX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface User {
  id: number;
  username: string;
  email: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  created_at: string;
  client_id?: number;
}

interface UsersListProps {
  users: User[];
  role: string;
}

const roleColors = {
  SUPER_ADMIN: "bg-blue-500/20 text-blue-700 dark:text-blue-500 rounded-full",
  ADMIN: "bg-green-500/20 text-green-700 dark:text-green-500 rounded-full",
  USER: "bg-gray-500/20 text-gray-700 dark:text-gray-500 rounded-full",
} as const;

export function UsersList({ users, role }: UsersListProps) {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const dateLocale = locale === "ru" ? "ru-RU" : "uz-UZ";
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const roleLabels = {
    SUPER_ADMIN: t("roleSuperAdmin"),
    ADMIN: t("roleAdmin"),
    USER: t("roleUser"),
  };

  const handleToggleActive = async (userId: number, currentStatus: boolean) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error(t("genericError"));
      }

      toast.success(!currentStatus ? t("activated") : t("deactivated"));

      router.refresh();
    } catch (error) {
      toast.error(tCommon("error"), {
        description: `${t("statusChangeError")}: ${error}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: "SUPER_ADMIN" | "ADMIN" | "USER") => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || t("genericError"));
      }

      toast.success(t("roleUpdated"));
      router.refresh();
    } catch (error) {
      toast.error(tCommon("error"), {
        description: error instanceof Error ? error.message : t("roleUpdateError"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${deleteUserId}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || t("deleteError"));
      }

      toast.success(tCommon("success"), {
        description: t("deleteSuccess"),
      });

      router.refresh();
    } catch (error) {
      toast.error(tCommon("error"), {
        description: error instanceof Error ? error.message : t("deleteError"),
      });
    } finally {
      setIsLoading(false);
      setDeleteUserId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(dateLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnUser")}</TableHead>
              <TableHead>{t("columnEmail")}</TableHead>
              <TableHead>{t("columnRole")}</TableHead>
              <TableHead>{t("columnStatus")}</TableHead>
              <TableHead>{t("columnCreated")}</TableHead>
              <TableHead className="text-right">{tCommon("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground text-center">
                  {t("noUsers")}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.username}</p>
                      {(user.first_name || user.last_name) && (
                        <p className="text-muted-foreground text-sm">
                          {user.first_name} {user.last_name}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email || "-"}</TableCell>
                  <TableCell>
                    {role === "SUPER_ADMIN" ? (
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.id, value as "SUPER_ADMIN" | "ADMIN" | "USER")}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="h-8 w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USER">{roleLabels.USER}</SelectItem>
                          <SelectItem value="ADMIN">{roleLabels.ADMIN}</SelectItem>
                          <SelectItem value="SUPER_ADMIN">{roleLabels.SUPER_ADMIN}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="default" className={roleColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "default" : "secondary"}>
                      {user.is_active ? t("active") : t("inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">{t("openMenu")}</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{tCommon("actions")}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                          disabled={isLoading}
                        >
                          {user.is_active ? (
                            <>
                              <UserX className="mr-2 h-4 w-4" />
                              {t("deactivate")}
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-2 h-4 w-4" />
                              {t("activate")}
                            </>
                          )}
                        </DropdownMenuItem>
                        {role === "SUPER_ADMIN" && (
                          <>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/users/${user.id}/edit`)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              {t("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteUserId(user.id)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("delete")}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading}
            >
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
