"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from "@prisma/client";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        toast.error("Foydalanuvchi ma'lumotlarini olishda xatolik");
        return;
      }
      const data = await response.json();
      setUserData(data.user);
      setFormData({
        first_name: data.user.first_name || "",
        last_name: data.user.last_name || "",
        username: data.user.username || "",
        email: data.user.email || "",
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          username: formData.username,
          email: formData.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Ma'lumotlarni yangilashda xatolik");
        return;
      }

      toast.success("Ma'lumotlar muvaffaqiyatli yangilandi");
      fetchUserData();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.new_password !== formData.confirm_password) {
      toast.error("Yangi parollar mos kelmaydi");
      return;
    }

    if (formData.new_password.length < 6) {
      toast.error("Parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: formData.current_password,
          new_password: formData.new_password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Parolni o'zgartirishda xatolik");
        return;
      }

      toast.success("Parol muvaffaqiyatli o'zgartirildi");
      setFormData((prev) => ({
        ...prev,
        current_password: "",
        new_password: "",
        confirm_password: "",
      }));
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 py-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Profil sozlamalari</h1>
          <p className="text-muted-foreground">Shaxsiy ma'lumotlaringizni boshqaring</p>
        </div>
      </div>

      <Separator />

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Shaxsiy ma'lumotlar</CardTitle>
          <CardDescription>Ism, familiya, username va email manzilni tahrirlash</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">Ism</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder="Ismingizni kiriting"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Familiya</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Familiyangizni kiriting"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Username kiriting"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="email@example.com"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saqlanmoqda...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Saqlash
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle>Parolni o'zgartirish</CardTitle>
          <CardDescription>Xavfsizlik uchun parolingizni yangilang</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Joriy parol</Label>
              <Input
                id="current_password"
                name="current_password"
                type="password"
                value={formData.current_password}
                onChange={handleInputChange}
                placeholder="Joriy parolingizni kiriting"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">Yangi parol</Label>
              <Input
                id="new_password"
                name="new_password"
                type="password"
                value={formData.new_password}
                onChange={handleInputChange}
                placeholder="Yangi parolni kiriting"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Parolni tasdiqlash</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                value={formData.confirm_password}
                onChange={handleInputChange}
                placeholder="Yangi parolni qayta kiriting"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    O'zgartirilmoqda...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Parolni o'zgartirish
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Hisob ma'lumotlari</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rol:</span>
            <span className="font-medium capitalize">{userData?.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hisob yaratilgan:</span>
            <span className="font-medium">
              {userData?.created_at ? new Date(userData.created_at).toLocaleDateString("uz-UZ") : "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Holat:</span>
            <span className="font-medium">{userData?.is_active ? "Faol" : "Nofaol"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
