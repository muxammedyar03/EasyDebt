"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  fetchUnreadNotificationCount,
  fetchUnreadNotificationPreview,
  markNotificationRead,
  notificationKeys,
  type HeaderNotification,
} from "../api/client";

const STALE_MS = 30_000;

export function useUnreadNotificationCount(initialCount?: number) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: fetchUnreadNotificationCount,
    initialData: initialCount,
    staleTime: STALE_MS,
    refetchOnWindowFocus: true,
    refetchOnMount: initialCount === undefined,
  });
}

export function useUnreadNotificationPreview(options?: { enabled?: boolean; initialData?: HeaderNotification[] }) {
  const enabled = options?.enabled ?? true;
  const initial = options?.initialData;
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: notificationKeys.unreadPreview(),
    queryFn: async () => {
      const data = await fetchUnreadNotificationPreview();
      // Keep badge in sync with list total (dropdown open / refetch)
      queryClient.setQueryData(notificationKeys.unreadCount(), data.total ?? 0);
      return data.notifications ?? [];
    },
    initialData: initial,
    staleTime: STALE_MS,
    enabled,
    refetchOnWindowFocus: enabled,
    refetchOnMount: enabled,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const prevPreview = queryClient.getQueryData<HeaderNotification[]>(notificationKeys.unreadPreview());
      const prevCount = queryClient.getQueryData<number>(notificationKeys.unreadCount());

      queryClient.setQueryData<HeaderNotification[]>(notificationKeys.unreadPreview(), (old) =>
        (old ?? []).map((n) => (n.id === id ? { ...n, is_read: true } : n)).filter((n) => !n.is_read),
      );

      if (typeof prevCount === "number" && prevCount > 0) {
        queryClient.setQueryData<number>(notificationKeys.unreadCount(), prevCount - 1);
      }

      return { prevPreview, prevCount };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prevPreview) {
        queryClient.setQueryData(notificationKeys.unreadPreview(), ctx.prevPreview);
      }
      if (typeof ctx?.prevCount === "number") {
        queryClient.setQueryData(notificationKeys.unreadCount(), ctx.prevCount);
      }
      toast.error("Не удалось отметить уведомление как прочитанное");
    },
    onSuccess: () => {
      toast.success("Уведомление отмечено как прочитанное", { duration: 2500 });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
