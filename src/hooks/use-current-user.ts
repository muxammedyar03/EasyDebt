"use client";

import { useEffect, useState } from "react";

interface User {
  id: number;
  username: string;
  email: string | null;
  role: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  created_at: string;
}

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch("/api/auth/me");

        if (!response.ok) {
          if (response.status === 401) {
            setUser(null);
            return;
          }
          throw new Error("Failed to fetch user");
        }

        const data = await response.json();
        setUser(data.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  return { user, loading, error, isAuthenticated: !!user };
}
