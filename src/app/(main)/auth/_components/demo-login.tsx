"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function DemoLogin() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const userData = {
    username: "guest",
    password: "guest123",
  };

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error("Login Failed", {
          description: result.error || "Invalid credentials",
          style: {
            background: "white",
            color: "black",
          },
          descriptionClassName: "!text-gray-600",
        });
        console.log("result", result);
        return;
      }

      toast.success("Login Successful", {
        description: `Welcome back, ${result.user.username}!`,
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
      toast.error("Error", {
        description: "An unexpected error occurred",
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
      Login as Guest {isLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : ""}
    </Button>
  );
}
