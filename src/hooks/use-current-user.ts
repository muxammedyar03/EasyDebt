"use client";

import { useQuery } from "@tanstack/react-query";

export interface CurrentUser {
  id: number;
  username: string;
  email: string | null;
  role: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  created_at: string;
}

export const CURRENT_USER_QUERY_KEY = ["current-user"] as const;

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const response = await fetch("/api/auth/me");

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to fetch user");
  }

  const data = await response.json();
  return data.user as CurrentUser;
}

export function useCurrentUser() {
  const query = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    user: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? "Unknown error" : null,
    isAuthenticated: !!query.data,
    refetch: query.refetch,
  };
}
