"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { flushOfflineQueue, getOfflineQueueCount } from "@/lib/offline/client-offline-sync";
import {
  checkDesktopUpdate,
  downloadAndInstallDesktopUpdate,
  getDesktopRuntimeInfo,
  listenToTauriDesktopEvent,
  sendDesktopNativeNotification,
  type DesktopRuntimeInfo,
} from "@/lib/desktop/tauri-bridge";
import type { SyncStatusReport } from "@/lib/sync/sync-engine";

export function DesktopSyncBar() {
  const router = useRouter();
  const [status, setStatus] = React.useState<SyncStatusReport | null>(null);
  const [runtimeInfo, setRuntimeInfo] = React.useState<DesktopRuntimeInfo | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [browserOnline, setBrowserOnline] = React.useState(true);
  const [localPendingCount, setLocalPendingCount] = React.useState(0);

  const handleInstallUpdate = React.useCallback(async () => {
    try {
      const res = await downloadAndInstallDesktopUpdate();
      if (res.success) {
        toast.success("Yangilanish o'rnatildi!", {
          description: "Yangi versiya kuchga kirishi uchun dasturni qayta ishga tushiring.",
        });
      } else {
        toast.error("Yangilanishni o'rnatib bo'lmadi", {
          description: res.error,
        });
      }
    } catch (err) {
      toast.error("Yangilashda xatolik", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const handleCheckUpdate = React.useCallback(
    async (silent = false) => {
      try {
        const res = await checkDesktopUpdate();
        if (res.available) {
          toast.info(`Yangi versiya mavjud: v${res.version}`, {
            description: res.body || "Desktop dasturini yangilash mumkin",
            action: {
              label: "O'rnatish",
              onClick: () => void handleInstallUpdate(),
            },
          });
        } else if (!silent) {
          toast.success("Sizda eng so'nggi versiya o'rnatilgan", {
            description: `Joriy versiya: v${runtimeInfo?.app_version ?? "2.0.0"}`,
          });
        }
      } catch {
        if (!silent) {
          toast.error("Yangilanishlarni tekshirishda xatolik yuz berdi");
        }
      }
    },
    [handleInstallUpdate, runtimeInfo?.app_version],
  );

  const fetchStatus = React.useCallback(async () => {
    if (typeof window !== "undefined" && !navigator.onLine) return;
    try {
      const res = await fetch("/api/sync", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as SyncStatusReport;
      setStatus(data);
    } catch {
      // ignore transient error
    }
  }, []);

  const statusRef = React.useRef<SyncStatusReport | null>(null);
  statusRef.current = status;

  const handleSyncNow = React.useCallback(
    async (silent = false) => {
      setIsSyncing(true);
      try {
        const { synced: offlineSynced } = await flushOfflineQueue();
        setLocalPendingCount(getOfflineQueueCount());

        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "sync-now" }),
        });
        const data = await res.json();
        if (data.status) {
          setStatus(data.status);
        }
        if (!silent) {
          if (offlineSynced > 0) {
            toast.success("Offlayn yozuvlar sinxronlandi", {
              description: `${offlineSynced} ta lokal amal serverga saqlandi.`,
            });
          }
          if (data.success) {
            toast.success("Sinxronizatsiya yakunlandi", {
              description: data.message,
            });
            if (data.pushedCount > 0 && statusRef.current?.syncMeta?.nativeNotifications) {
              void sendDesktopNativeNotification("EasyDebt Desktop — Sinxronizatsiya", data.message);
            }
          } else {
            toast.warning("Sinxronizatsiya", {
              description: data.message || "Ba'zi yozuvlar sinxronlanmadi",
            });
          }
        }
        if (data.pushedCount > 0 || data.pulledCount > 0 || offlineSynced > 0) {
          router.refresh();
        }
      } catch (err) {
        if (!silent) {
          toast.error("Sinxronizatsiya xatosi", {
            description: err instanceof Error ? err.message : "Tarmoq xatosi",
          });
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [router],
  );

  React.useEffect(() => {
    setBrowserOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    setLocalPendingCount(getOfflineQueueCount());
    void fetchStatus();
    void getDesktopRuntimeInfo().then((info) => {
      setRuntimeInfo(info);
      if (info.is_tauri) {
        void handleCheckUpdate(true);
      }
    });

    const onOnline = () => {
      setBrowserOnline(true);
      toast.info("Internet aloqasi tiklandi — lokal o'zgarishlar sinxronlanmoqda...");
      void handleSyncNow(true);
    };
    const onOffline = () => {
      setBrowserOnline(false);
      toast.warning("Internet uzildi — EasyDebt Offlayn (lokal xotira) rejimida ishlamoqda");
    };
    const onQueueChanged = (e: Event) => {
      const custom = e as CustomEvent<{ count: number }>;
      setLocalPendingCount(custom.detail?.count ?? getOfflineQueueCount());
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("easydebt:offline-queue-changed", onQueueChanged);

    let unlistenSync: (() => void) | undefined;
    void listenToTauriDesktopEvent("desktop://trigger-sync", () => {
      void handleSyncNow(false);
    }).then((fn) => {
      unlistenSync = fn;
    });

    const interval = window.setInterval(() => {
      void fetchStatus();
      setLocalPendingCount(getOfflineQueueCount());
    }, 15000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("easydebt:offline-queue-changed", onQueueChanged);
      unlistenSync?.();
      window.clearInterval(interval);
    };
  }, [fetchStatus, handleCheckUpdate, handleSyncNow]);

  const isOffline = !browserOnline || Boolean(status?.offlineModeForced);
  const pendingCount = (status?.pendingCount ?? 0) + localPendingCount;
  const statusLabel =
    pendingCount > 0
      ? `${isOffline ? "Offlayn, lokal" : "Onlayn, sinxron"}, ${pendingCount} navbatda`
      : isOffline
        ? "Offlayn, lokal"
        : "Onlayn, sinxron";

  return (
    <div className="bg-card border-border flex items-center gap-1 rounded-lg border p-1">
      <div
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        role="status"
        title={isOffline ? "Offlayn · Lokal" : "Onlayn · Sinxron"}
        aria-label={statusLabel}
      >
        {isSyncing ? (
          <RefreshCw className="size-5 animate-spin text-amber-600" />
        ) : isOffline ? (
          <CloudOff className="size-5 text-amber-600" />
        ) : (
          <Cloud className="size-5 text-emerald-600" />
        )}
        {pendingCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 font-mono text-[10px] font-semibold text-white tabular-nums">
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        )}
      </div>
      <div className="bg-border h-7 w-px" />
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
        disabled={isSyncing || isOffline}
        onClick={() => void handleSyncNow(false)}
        title="Server bilan hozir sinxronlash"
      >
        <RefreshCw className={`size-4 ${isSyncing ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
