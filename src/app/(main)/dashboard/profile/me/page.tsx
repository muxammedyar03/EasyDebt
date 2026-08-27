"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CURRENT_USER_QUERY_KEY, useCurrentUser } from "@/hooks/use-current-user";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: userData, loading, error, refetch } = useCurrentUser();
  const [saving, setSaving] = useState(false);
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
    if (error) {
      toast.error(t("fetchError"));
    }
  }, [error, t]);

  useEffect(() => {
    if (!userData) return;
    setFormData((prev) => ({
      ...prev,
      first_name: userData.first_name || "",
      last_name: userData.last_name || "",
      username: userData.username || "",
      email: userData.email || "",
    }));
  }, [userData]);

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
        toast.error(data.error || t("updateError"));
        return;
      }

      toast.success(t("updateSuccess"));
      await queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      await refetch();
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error(tCommon("error"));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.new_password !== formData.confirm_password) {
      toast.error(t("passwordMismatch"));
      return;
    }

    if (formData.new_password.length < 6) {
      toast.error(t("passwordMin"));
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
        toast.error(data.error || t("passwordChangeError"));
        return;
      }

      toast.success(t("passwordChangeSuccess"));
      setFormData((prev) => ({
        ...prev,
        current_password: "",
        new_password: "",
        confirm_password: "",
      }));
    } catch (err) {
      console.error("Error changing password:", err);
      toast.error(tCommon("error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  const dateLocale = locale === "ru" ? "ru-RU" : "uz-UZ";

  return (
    <div className="container mx-auto max-w-4xl space-y-6 py-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>{t("personalInfo")}</CardTitle>
          <CardDescription>{t("personalInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">{t("firstName")}</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder={t("firstNamePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">{t("lastName")}</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder={t("lastNamePlaceholder")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">{t("username")}</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder={t("usernamePlaceholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
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
                    {tCommon("saving")}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {tCommon("save")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("passwordTitle")}</CardTitle>
          <CardDescription>{t("passwordDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">{t("currentPassword")}</Label>
              <Input
                id="current_password"
                name="current_password"
                type="password"
                value={formData.current_password}
                onChange={handleInputChange}
                placeholder={t("currentPasswordPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">{t("newPassword")}</Label>
              <Input
                id="new_password"
                name="new_password"
                type="password"
                value={formData.new_password}
                onChange={handleInputChange}
                placeholder={t("newPasswordPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">{t("confirmPassword")}</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                value={formData.confirm_password}
                onChange={handleInputChange}
                placeholder={t("confirmPasswordPlaceholder")}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("changing")}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t("changePassword")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("accountInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("role")}</span>
            <span className="font-medium capitalize">{userData?.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("createdAt")}</span>
            <span className="font-medium">
              {userData?.created_at ? new Date(userData.created_at).toLocaleDateString(dateLocale) : "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("status")}</span>
            <span className="font-medium">{userData?.is_active ? t("active") : t("inactive")}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
