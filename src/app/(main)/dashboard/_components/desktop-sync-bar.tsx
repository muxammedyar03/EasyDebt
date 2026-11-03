"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  HardDrive,
  Printer,
  Bell,
  Download,
  Upload,
  Monitor,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Maximize2,
  Minimize2,
  ArrowUpCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  checkDesktopUpdate,
  controlDesktopWindow,
  downloadAndInstallDesktopUpdate,
  getDesktopRuntimeInfo,
  getPreferredThermalWidth,
  listenToTauriDesktopEvent,
  sendDesktopNativeNotification,
  setDesktopAlwaysOnTop,
  setDesktopMinimizeToTray,
  setPreferredThermalWidth,
  type DesktopRuntimeInfo,
  type DesktopUpdateResult,
} from "@/lib/desktop/tauri-bridge";
import { printReceipt } from "@/features/receipt-printer/lib/print-receipt";
import type { SyncStatusReport } from "@/lib/sync/sync-engine";

export function DesktopSyncBar() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<SyncStatusReport | null>(null);
  const [runtimeInfo, setRuntimeInfo] = React.useState<DesktopRuntimeInfo | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [browserOnline, setBrowserOnline] = React.useState(true);
  const [paperWidth, setPaperWidth] = React.useState<"80mm" | "58mm">("80mm");
  const [alwaysOnTop, setAlwaysOnTop] = React.useState(false);
  const [remoteUrlInput, setRemoteUrlInput] = React.useState("https://easydebt.uz");
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [updateInfo, setUpdateInfo] = React.useState<DesktopUpdateResult | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = React.useState(false);
  const [isInstallingUpdate, setIsInstallingUpdate] = React.useState(false);
  const [updateProgress, setUpdateProgress] = React.useState<number | null>(null);

  const handleInstallUpdate = React.useCallback(async () => {
    setIsInstallingUpdate(true);
    setUpdateProgress(0);
    try {
      const res = await downloadAndInstallDesktopUpdate((pct) => {
        setUpdateProgress(pct);
      });
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
    } finally {
      setIsInstallingUpdate(false);
    }
  }, []);

  const handleCheckUpdate = React.useCallback(
    async (silent = false) => {
      setIsCheckingUpdate(true);
      try {
        const res = await checkDesktopUpdate();
        setUpdateInfo(res);
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
      } finally {
        setIsCheckingUpdate(false);
      }
    },
    [handleInstallUpdate, runtimeInfo?.app_version],
  );

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch("/api/sync", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as SyncStatusReport;
      setStatus(data);
      if (data.syncMeta?.remoteServerUrl) {
        setRemoteUrlInput(data.syncMeta.remoteServerUrl);
      }
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
        if (data.pushedCount > 0 || data.pulledCount > 0) {
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
    setPaperWidth(getPreferredThermalWidth());
    void fetchStatus();
    void getDesktopRuntimeInfo().then((info) => {
      setRuntimeInfo(info);
      setAlwaysOnTop(info.always_on_top);
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

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    let unlistenSync: (() => void) | undefined;
    void listenToTauriDesktopEvent("desktop://trigger-sync", () => {
      void handleSyncNow(false);
    }).then((fn) => {
      unlistenSync = fn;
    });

    const interval = window.setInterval(() => {
      void fetchStatus();
    }, 15000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      unlistenSync?.();
      window.clearInterval(interval);
    };
  }, [fetchStatus, handleCheckUpdate, handleSyncNow]);

  const handleToggleOfflineMode = async (checked: boolean) => {
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-offline", offlineModeForced: checked }),
      });
      const data = await res.json();
      if (data.status) setStatus(data.status);
      toast.info(data.message);
      router.refresh();
    } catch {
      toast.error("Rejimni o'zgartirishda xatolik");
    }
  };

  const handleUpdatePreference = async (patch: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-preferences", ...patch }),
      });
      const data = await res.json();
      if (data.status) setStatus(data.status);
      toast.success("Sozlamalar yangilandi");
    } catch {
      toast.error("Sozlamani saqlashda xatolik");
    }
  };

  const handleClearSynced = async () => {
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-synced" }),
      });
      const data = await res.json();
      if (data.status) setStatus(data.status);
      toast.success(data.message);
    } catch {
      toast.error("Tozalashda xatolik");
    }
  };

  const handleRetryFailed = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry-failed" }),
      });
      const data = await res.json();
      if (data.status) setStatus(data.status);
      toast.success(data.message || "Qayta urinish yakunlandi");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await fetch("/api/sync?export=1", { credentials: "same-origin", cache: "no-store" });
      const text = await res.text();
      const blob = new Blob([text], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `easydebt-local-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("Lokal ma'lumotlar bazasi zaxira nusxasi yuklab olindi");
    } catch {
      toast.error("Zaxira nusxasini yuklab olishda xatolik");
    }
  };

  const handleDesktopCodeExport = async (type: "patch" | "installer", mode: "download" | "copy" = "download") => {
    const filename = type === "patch" ? "feat-tauri-desktop.patch" : "apply-tauri-desktop.mjs";
    try {
      const res = await fetch(`/api/desktop-export?type=${type}&t=${Date.now()}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let text = await res.text();
      if (text.includes("<title>Cookie check</title>") || text.trim().startsWith("<!DOCTYPE")) {
        throw new Error("Cookie check HTML aniqlandi");
      }
      if (type === "patch") {
        const idx = text.indexOf("diff --git ");
        if (idx > 0) text = text.slice(idx);
      }
      if (mode === "copy") {
        await navigator.clipboard.writeText(text);
        toast.success(`${filename} buferga (Clipboard) nusxalandi!`);
        return;
      }
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success(`${filename} yuklab olindi (diff --git tekshirildi)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Eksport xatosi");
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const snapshot = JSON.parse(text);
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import-backup", snapshot }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Zaxira fayli noto'g'ri");
        return;
      }
      if (data.status) setStatus(data.status);
      toast.success(data.message);
      router.refresh();
    } catch {
      toast.error("Zaxira faylini o'qishda xatolik yuz berdi");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleTestReceipt = () => {
    printReceipt({
      type: "PAYMENT",
      docNumber: `CHK-${Date.now().toString().slice(-6)}`,
      date: new Date(),
      debtorName: "Test Mijoz (Desktop)",
      debtorPhone: "+998 90 123 45 67",
      employeeName: "Admin Kassir",
      amount: 150000,
      paymentType: "CASH",
      description: `Termal chek sinovi (${paperWidth})`,
      previousBalance: 450000,
      newBalance: 300000,
    });
    toast.success(`Test chek (${paperWidth}) chop etishga yuborildi`);
  };

  const handleTestNotification = async () => {
    const sent = await sendDesktopNativeNotification(
      "EasyDebt Desktop",
      "Lokal xotira va tizim bildirishnomalari muvaffaqiyatli ishlamoqda.",
    );
    if (sent) {
      toast.success("Tizim bildirishnomasi yuborildi");
    } else {
      toast.info("EasyDebt Desktop: Bildirishnoma tizimi faol");
    }
  };

  const isOffline = !browserOnline || Boolean(status?.offlineModeForced);
  const pendingCount = status?.pendingCount ?? 0;

  return (
    <div className="flex items-center gap-1.5">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 shrink-0 gap-2 px-3 text-xs font-medium whitespace-nowrap">
            {isSyncing ? (
              <RefreshCw className="size-3.5 animate-spin text-amber-600" />
            ) : isOffline ? (
              <CloudOff className="size-3.5 text-amber-600" />
            ) : (
              <Cloud className="size-3.5 text-emerald-600" />
            )}
            <span className="hidden sm:inline">{isOffline ? "Offlayn · Lokal" : "Onlayn · Sinxron"}</span>
            {pendingCount > 0 && (
              <>
                <span aria-hidden="true" className="text-muted-foreground">
                  ·
                </span>
                <span className="font-mono font-semibold text-amber-600 tabular-nums">{pendingCount} navbatda</span>
              </>
            )}
          </Button>
        </DialogTrigger>

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

        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              <span className="flex items-center gap-2">
                <Monitor className="size-5" />
                EasyDebt Desktop &amp; Offline-First Sinxronizatsiya Markazi
              </span>
              <span className="text-muted-foreground font-mono text-xs font-normal tabular-nums">
                {runtimeInfo?.is_tauri ? "Tauri v2 Native" : "Desktop Web Runtime"} · v
                {runtimeInfo?.app_version ?? "2.0.0"}
              </span>
            </DialogTitle>
            <DialogDescription>
              Ma&apos;lumotlar kompyuter xotirasida lokal saqlanadi va internet bo&apos;lganda asosiy server bazasi
              bilan sinxronlanadi.
            </DialogDescription>
          </DialogHeader>

          {/* Summary Bar */}
          <div className="bg-muted/40 grid grid-cols-2 gap-3 rounded-lg border p-3 sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground text-xs">Tarmoq va Rejim</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
                {isOffline ? (
                  <>
                    <CloudOff className="size-4 text-amber-600" />
                    <span>Offlayn (Lokal)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>Onlayn (Faol)</span>
                  </>
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Navbatdagi yozuvlar</p>
              <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{pendingCount} ta kutilmoqda</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Lokal bazadagi yozuvlar</p>
              <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                {status?.localCounts.debtors ?? 0} qarzdor ·{" "}
                {(status?.localCounts.debts ?? 0) + (status?.localCounts.payments ?? 0)} amal
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Oxirgi sinxronlash</p>
              <p className="mt-0.5 font-mono text-xs font-medium tabular-nums">
                {status?.lastSyncedAt
                  ? new Date(status.lastSyncedAt).toLocaleTimeString("uz-UZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "Hali bajarilmagan"}
              </p>
            </div>
          </div>

          <Tabs defaultValue="outbox" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="outbox">Sinxronizatsiya Navbati</TabsTrigger>
              <TabsTrigger value="storage">Lokal Baza &amp; Zaxira</TabsTrigger>
              <TabsTrigger value="desktop">Desktop &amp; Printer</TabsTrigger>
            </TabsList>

            {/* TAB 1: OUTBOX QUEUE */}
            <TabsContent value="outbox" className="space-y-4 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-muted-foreground text-xs">
                  Jami sinxronlangan:{" "}
                  <span className="text-foreground font-mono font-semibold tabular-nums">
                    {status?.totalSyncedCount ?? 0}
                  </span>{" "}
                  · Xatolar:{" "}
                  <span className="text-foreground font-mono font-semibold tabular-nums">
                    {status?.failedCount ?? 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {(status?.failedCount ?? 0) > 0 && (
                    <Button variant="outline" size="sm" onClick={() => void handleRetryFailed()} disabled={isSyncing}>
                      <RotateCcw className="mr-1.5 size-3.5" />
                      Xatolarni qayta urinish
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => void handleClearSynced()}>
                    <Trash2 className="mr-1.5 size-3.5" />
                    Tarixni tozalash
                  </Button>
                  <Button size="sm" onClick={() => void handleSyncNow(false)} disabled={isSyncing || isOffline}>
                    <RefreshCw className={`mr-1.5 size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    Hozir sinxronlash
                  </Button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border">
                {!status?.outboxItems?.length ? (
                  <div className="text-muted-foreground flex flex-col items-center justify-center py-10 text-center text-sm">
                    <CheckCircle2 className="mb-2 size-6 text-emerald-600" />
                    <p className="font-medium">Sinxronizatsiya navbati bo&apos;sh</p>
                    <p className="text-xs">
                      Yangi qarz, to&apos;lov yoki qarzdor qo&apos;shilganda bu yerda aks etadi.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground sticky top-0 border-b">
                      <tr>
                        <th className="px-3 py-2 font-medium">Yozuv / Amal</th>
                        <th className="px-3 py-2 font-medium">Tur</th>
                        <th className="px-3 py-2 font-medium">Vaqt</th>
                        <th className="px-3 py-2 text-right font-medium">Holat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {status.outboxItems.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium">{item.entityLabel}</td>
                          <td className="text-muted-foreground px-3 py-2 font-mono">
                            {item.entityType} · {item.operation}
                          </td>
                          <td className="text-muted-foreground px-3 py-2 font-mono tabular-nums">
                            {new Date(item.createdAt).toLocaleTimeString("uz-UZ")}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">
                            {item.status === "SYNCED" ? (
                              <span className="text-emerald-600">Sinxronlangan</span>
                            ) : item.status === "FAILED" ? (
                              <span className="text-red-600" title={item.errorMessage ?? ""}>
                                Xatolik
                              </span>
                            ) : (
                              <span className="text-amber-600">Navbatda</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: LOCAL STORAGE & BACKUP */}
            <TabsContent value="storage" className="space-y-4 pt-3">
              <div className="flex items-center justify-between rounded-lg border p-3.5">
                <div className="space-y-0.5">
                  <Label htmlFor="force-offline" className="text-sm font-medium">
                    Majburiy Offlayn Rejim (Faqat Lokal Baza)
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Yoqilganda dastur serverga ulanmasdan faqat kompyuterning lokal xotirasida ishlaydi.
                  </p>
                </div>
                <Switch
                  id="force-offline"
                  checked={Boolean(status?.offlineModeForced)}
                  onCheckedChange={(checked) => void handleToggleOfflineMode(checked)}
                />
              </div>

              <div className="space-y-2 rounded-lg border p-3.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <HardDrive className="size-4" />
                  <span>Lokal Ma&apos;lumotlar Bazasi Manzili</span>
                </div>
                <p className="bg-muted rounded px-2.5 py-1.5 font-mono text-xs break-all">
                  {status?.localDbPath || ".local-data/easydebt-desktop-db.json"}
                </p>
                <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                  <div className="rounded border p-2">
                    <div className="font-mono text-base font-bold tabular-nums">{status?.localCounts.debtors ?? 0}</div>
                    <div className="text-muted-foreground text-xs">Qarzdorlar</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="font-mono text-base font-bold tabular-nums">{status?.localCounts.debts ?? 0}</div>
                    <div className="text-muted-foreground text-xs">Qarzlar</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="font-mono text-base font-bold tabular-nums">
                      {status?.localCounts.payments ?? 0}
                    </div>
                    <div className="text-muted-foreground text-xs">To&apos;lovlar</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="font-mono text-base font-bold tabular-nums">
                      {status?.localCounts.reminders ?? 0}
                    </div>
                    <div className="text-muted-foreground text-xs">Eslatmalar</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border p-3.5">
                <Label htmlFor="remote-server-url" className="text-xs font-medium">
                  Markaziy Sinxronizatsiya Server Manzili
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="remote-server-url"
                    value={remoteUrlInput}
                    onChange={(e) => setRemoteUrlInput(e.target.value)}
                    placeholder="https://easydebt.uz"
                    className="h-9 font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0"
                    onClick={() => void handleUpdatePreference({ remoteServerUrl: remoteUrlInput })}
                  >
                    Saqlash
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3.5">
                <div>
                  <p className="text-sm font-medium">Lokal Zaxira Nusxasi (Backup &amp; Restore)</p>
                  <p className="text-muted-foreground text-xs">
                    Barcha lokal ma&apos;lumotlarni JSON fayl sifatida saqlab olish yoki qayta tiklash
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => void handleImportBackup(e)}
                  />
                  <Button variant="outline" size="sm" onClick={() => void handleDesktopCodeExport("patch", "download")}>
                    <Download className="mr-1.5 size-3.5" />
                    Git Patch (.patch)
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void handleDesktopCodeExport("patch", "copy")}>
                    Patch Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDesktopCodeExport("installer", "download")}
                  >
                    <Download className="mr-1.5 size-3.5" />
                    Auto-Push (.mjs)
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-1.5 size-3.5" />
                    Zaxiradan tiklash
                  </Button>
                  <Button variant="default" size="sm" onClick={() => void handleExportBackup()}>
                    <Download className="mr-1.5 size-3.5" />
                    Zaxira yuklab olish
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: DESKTOP & PRINTER */}
            <TabsContent value="desktop" className="space-y-4 pt-3">
              {/* Thermal Printer Config */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Printer className="size-4" />
                    <span>Termal Printer Qog&apos;oz O&apos;lchami</span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    POS termal printeringizga mos kenglikni tanlang (80mm standart yoki 58mm ixcham)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-muted flex items-center gap-1 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPaperWidth("80mm");
                        setPreferredThermalWidth("80mm");
                        void handleUpdatePreference({ thermalPaperWidth: "80mm" });
                      }}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        paperWidth === "80mm" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                      }`}
                    >
                      80mm
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaperWidth("58mm");
                        setPreferredThermalWidth("58mm");
                        void handleUpdatePreference({ thermalPaperWidth: "58mm" });
                      }}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        paperWidth === "58mm" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                      }`}
                    >
                      58mm
                    </button>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleTestReceipt}>
                    <Printer className="mr-1.5 size-3.5" />
                    Test Chek
                  </Button>
                </div>
              </div>

              {/* System Tray & Native Notifications */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-3.5">
                  <div className="space-y-0.5 pr-2">
                    <Label htmlFor="tray-toggle" className="text-sm font-medium">
                      System Tray (Fonda ishlash)
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Oynani yopganda dastur treyga yig&apos;iladi va sinxronlashni davom ettiradi
                    </p>
                  </div>
                  <Switch
                    id="tray-toggle"
                    checked={status?.syncMeta?.minimizeToTray ?? true}
                    onCheckedChange={(checked) => {
                      void setDesktopMinimizeToTray(checked);
                      void handleUpdatePreference({ minimizeToTray: checked });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3.5">
                  <div className="space-y-0.5 pr-2">
                    <Label htmlFor="always-top-toggle" className="text-sm font-medium">
                      Oynani ustida ushlash
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Kassa rejimida dastur oynasini boshqa oynalar ustida mahkamlash
                    </p>
                  </div>
                  <Switch
                    id="always-top-toggle"
                    checked={alwaysOnTop}
                    onCheckedChange={(checked) => {
                      setAlwaysOnTop(checked);
                      void setDesktopAlwaysOnTop(checked);
                      toast.info(checked ? "Oyna ustida mahkamlandi" : "Oyna oddiy rejimga qaytdi");
                    }}
                  />
                </div>
              </div>

              {/* Native Notifications & Window Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Bell className="size-4" />
                    <span>Tizim Bildirishnomalari va Oynani Boshqarish</span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Muddati o&apos;tgan qarzlar va eslatmalar haqida OS bildirishnomasi yuborish
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => void handleTestNotification()}>
                    <Bell className="mr-1.5 size-3.5" />
                    Test Bildirishnoma
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void controlDesktopWindow("toggle_maximize")}>
                    <Maximize2 className="mr-1.5 size-3.5" />
                    To&apos;liq ekran
                  </Button>
                  {runtimeInfo?.is_tauri && (
                    <Button variant="outline" size="sm" onClick={() => void controlDesktopWindow("hide_to_tray")}>
                      <Minimize2 className="mr-1.5 size-3.5" />
                      Treyga yig&apos;ish
                    </Button>
                  )}
                </div>
              </div>

              {/* Desktop Auto-Update Section */}
              <div className="bg-muted/20 flex flex-col gap-3 rounded-lg border p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <ArrowUpCircle className="text-primary size-4" />
                      <span>Desktop Dasturini Yangilash (Auto-Update)</span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Joriy versiya:{" "}
                      <span className="text-foreground font-mono font-medium">
                        v{runtimeInfo?.app_version ?? "2.0.0"}
                      </span>
                      {updateInfo?.available && (
                        <span className="ml-2 font-semibold text-emerald-600">
                          (Yangi: v{updateInfo.version} mavjud!)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isCheckingUpdate || isInstallingUpdate}
                      onClick={() => void handleCheckUpdate(false)}
                    >
                      <RefreshCw className={`mr-1.5 size-3.5 ${isCheckingUpdate ? "animate-spin" : ""}`} />
                      Tekshirish
                    </Button>
                    {updateInfo?.available && (
                      <Button
                        variant="default"
                        size="sm"
                        disabled={isInstallingUpdate}
                        onClick={() => void handleInstallUpdate()}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        {isInstallingUpdate ? (
                          <>
                            <RefreshCw className="mr-1.5 size-3.5 animate-spin" />
                            {updateProgress !== null ? `${updateProgress}%` : "O'rnatilmoqda..."}
                          </>
                        ) : (
                          <>
                            <Download className="mr-1.5 size-3.5" />v{updateInfo.version} O&apos;rnatish
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {updateInfo?.available && updateInfo.body && (
                  <div className="bg-background/80 text-muted-foreground rounded border p-2 text-xs">
                    <p className="text-foreground mb-1 font-medium">O&apos;zgarishlar:</p>
                    <p className="whitespace-pre-line">{updateInfo.body}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
