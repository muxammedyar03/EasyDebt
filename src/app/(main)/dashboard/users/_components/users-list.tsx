"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, UserCheck, UserX } from "lucide-react";

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
  status: "ACTIVE" | "BLOCKED" | "DEACTIVATED";
  shop_id: number | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}

interface UsersListProps {
  users: User[];
}

const roleColors = {
  SUPER_ADMIN: "destructive",
  ADMIN: "default",
  USER: "secondary",
} as const;

const roleLabels = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  USER: "User",
};

export function UsersList({ users }: UsersListProps) {
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleToggleActive = async (userId: number, currentStatus: string) => {
    setIsLoading(true);
    const newStatus = currentStatus === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    try {
      const response = await fetch(`/api/dashboard/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Xatolik yuz berdi");
      }

      toast.success(currentStatus === "ACTIVE" ? "Foydalanuvchi bloklandi" : "Foydalanuvchi faollashtirildi");
      router.refresh();
    } catch (error) {
      toast.error("Xatolik", {
        description: `${"Status o'zgartirishda xatolik: " + error}`,
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

      if (!response.ok) {
        throw new Error("Xatolik yuz berdi");
      }

      toast.success("Muvaffaqiyatli", {
        description: "Foydalanuvchi o'chirildi",
      });

      router.refresh();
    } catch (error) {
      toast.error("Xatolik", {
        description: `${"Foydalanuvchini o'chirishda xatolik: " + error}`,
      });
    } finally {
      setIsLoading(false);
      setDeleteUserId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uz-UZ", {
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
              <TableHead>Foydalanuvchi</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Yaratilgan</TableHead>
              <TableHead className="text-right">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground text-center">
                  Foydalanuvchilar topilmadi
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
                    <Badge variant={roleColors[user.role]}>{roleLabels[user.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === "ACTIVE" ? "default" : user.status === "BLOCKED" ? "destructive" : "secondary"
                      }
                    >
                      {user.status === "ACTIVE" ? "Faol" : user.status === "BLOCKED" ? "Bloklangan" : "O'chirilgan"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Menu ochish</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Amallar</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleActive(user.id, user.status)} disabled={isLoading}>
                          {user.status === "ACTIVE" ? (
                            <>
                              <UserX className="mr-2 h-4 w-4" />
                              Bloklash
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Faollashtirish
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/users/${user.id}/edit`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Tahrirlash
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteUserId(user.id)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          O&apos;chirish
                        </DropdownMenuItem>
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
            <AlertDialogTitle>Ishonchingiz komilmi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu amal qaytarib bo&apos;lmaydi. Foydalanuvchi ma&apos;limotlari butunlay o&apos;chiriladi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading}
            >
              O&apos;chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
