"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { t } from "@/lib/i18n";

export function DemoLogin() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/auth/guest", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(t("auth.loginFailed"), {
          description: result.error || t("auth.invalidCredentials"),
          style: {
            background: "white",
            color: "black",
          },
          descriptionClassName: "!text-gray-600",
        });
        console.log("result", result);
        return;
      }

      toast.success(t("auth.loginSuccessful"), {
        description: t("auth.welcomeBack", { username: result.user.username }),
        style: {
          background: "white",
          color: "black",
        },
        descriptionClassName: "!text-gray-600",
      });

      // Redirect to dashboard
      router.push("/dashboard/default");
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      toast.error(t("common.error"), {
        description: t("common.unexpectedError"),
        style: {
          background: "white",
          color: "black",
        },
        descriptionClassName: "!text-gray-600",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleLogin}
      className="h-28 w-full rounded-2xl border-indigo-500/50 bg-gradient-to-r from-indigo-700/10 to-gray-600/10 text-xl"
    >
      {t("auth.loginAsGuest")} {isLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : ""}
    </Button>
  );
}
