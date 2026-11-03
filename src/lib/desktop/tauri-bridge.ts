"use client";

/**
 * EasyDebt Desktop — Tauri v2 IPC & Native OS Bridge
 *
 * Automatically detects whether the app is running inside a Tauri v2 Desktop WebView
 * (`window.__TAURI_INTERNALS__` or `window.__TAURI__`) and provides type-safe
 * wrappers for:
 * - Native OS Notifications (Windows / macOS / Linux)
 * - Direct Thermal Receipt Printing (80mm / 58mm)
 * - System Tray & Minimize-to-Tray preferences
 * - Native Window Controls (Minimize, Maximize/Restore, Always-on-Top, Hide to Tray)
 * - Tauri Event Listeners (`desktop://trigger-sync`, `desktop://quick-create`)
 */

export interface DesktopRuntimeInfo {
  is_tauri: boolean;
  platform: string;
  arch: string;
  app_version: string;
  minimize_to_tray: boolean;
  always_on_top: boolean;
  local_data_dir: string;
}

interface TauriGlobal {
  core?: {
    invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
  };
  event?: {
    listen: <T = unknown>(
      event: string,
      handler: (payload: { event: string; payload: T }) => void,
    ) => Promise<() => void>;
  };
}

function getTauriGlobal(): TauriGlobal | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    __TAURI__?: TauriGlobal;
    __TAURI_INTERNALS__?: { invoke?: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T> };
  };
  if (w.__TAURI__?.core?.invoke) {
    return w.__TAURI__;
  }
  if (w.__TAURI_INTERNALS__?.invoke) {
    return {
      core: {
        invoke: w.__TAURI_INTERNALS__.invoke.bind(w.__TAURI_INTERNALS__),
      },
    };
  }
  return null;
}

export function isTauriDesktop(): boolean {
  return getTauriGlobal() !== null;
}

export async function invokeTauriCommand<T = unknown>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T | null> {
  const tauri = getTauriGlobal();
  if (!tauri?.core?.invoke) return null;
  try {
    return await tauri.core.invoke<T>(command, args);
  } catch (err) {
    console.warn(`[EasyDebt Tauri] Command "${command}" failed:`, err);
    return null;
  }
}

export async function getDesktopRuntimeInfo(): Promise<DesktopRuntimeInfo> {
  const res = await invokeTauriCommand<DesktopRuntimeInfo>("get_desktop_runtime_info");
  if (res) return res;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  let platform = "web-desktop";
  if (ua.includes("Win")) platform = "windows";
  else if (ua.includes("Mac")) platform = "macos";
  else if (ua.includes("Linux")) platform = "linux";

  return {
    is_tauri: false,
    platform,
    arch: "x64",
    app_version: "2.0.0",
    minimize_to_tray: true,
    always_on_top: false,
    local_data_dir: ".local-data/easydebt-desktop-db.json",
  };
}

export async function controlDesktopWindow(
  action: "minimize" | "toggle_maximize" | "hide_to_tray" | "show" | "close",
): Promise<boolean> {
  const res = await invokeTauriCommand<string>("window_control", { action });
  if (res) return true;

  if (typeof window !== "undefined" && action === "toggle_maximize") {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {});
    } else {
      await document.exitFullscreen().catch(() => {});
    }
    return true;
  }
  return false;
}

export async function setDesktopMinimizeToTray(enabled: boolean): Promise<boolean> {
  const res = await invokeTauriCommand<boolean>("set_minimize_to_tray", { enabled });
  return res ?? enabled;
}

export async function setDesktopAlwaysOnTop(enabled: boolean): Promise<boolean> {
  const res = await invokeTauriCommand<boolean>("set_window_always_on_top", { enabled });
  return res ?? enabled;
}

export async function sendDesktopNativeNotification(title: string, body: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/avatars/user.png",
      });
      return true;
    }
    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification(title, {
          body,
          icon: "/avatars/user.png",
        });
        return true;
      }
    }
  }
  return false;
}

export function getPreferredThermalWidth(): "80mm" | "58mm" {
  if (typeof window === "undefined") return "80mm";
  const saved = window.localStorage.getItem("easydebt_thermal_width");
  return saved === "58mm" ? "58mm" : "80mm";
}

export function setPreferredThermalWidth(width: "80mm" | "58mm"): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("easydebt_thermal_width", width);
}

export async function listenToTauriDesktopEvent(eventName: string, callback: () => void): Promise<() => void> {
  const tauri = getTauriGlobal();
  if (tauri?.event?.listen) {
    try {
      return await tauri.event.listen(eventName, () => callback());
    } catch {
      // Fallback to window custom event
    }
  }
  if (typeof window !== "undefined") {
    const handler = () => callback();
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }
  return () => {};
}

export interface DesktopUpdateResult {
  available: boolean;
  currentVersion?: string;
  version?: string;
  body?: string;
  date?: string;
}

let activeUpdateInstance: unknown = null;

export async function checkDesktopUpdate(): Promise<DesktopUpdateResult> {
  if (!isTauriDesktop()) {
    return { available: false };
  }

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (update?.available) {
      activeUpdateInstance = update;
      return {
        available: true,
        currentVersion: update.currentVersion,
        version: update.version,
        body: update.body ?? "",
        date: update.date ?? "",
      };
    }
    return { available: false, currentVersion: update?.currentVersion };
  } catch (err) {
    console.warn("[EasyDebt Tauri] Updater check failed:", err);
    return { available: false };
  }
}

export async function downloadAndInstallDesktopUpdate(
  onProgress?: (progressPercent: number) => void,
): Promise<{ success: boolean; error?: string }> {
  if (!isTauriDesktop() || !activeUpdateInstance) {
    return { success: false, error: "Tauri update unavailable" };
  }

  try {
    const update = activeUpdateInstance as {
      downloadAndInstall: (
        cb: (progress: { event: string; data?: { chunkLength?: number; contentLength?: number } }) => void,
      ) => Promise<void>;
    };

    let downloadedBytes = 0;
    await update.downloadAndInstall((event) => {
      if (event.event === "Started") {
        onProgress?.(0);
      } else if (event.event === "Progress" && event.data?.chunkLength && event.data?.contentLength) {
        downloadedBytes += event.data.chunkLength;
        const pct = Math.min(100, Math.round((downloadedBytes / event.data.contentLength) * 100));
        onProgress?.(pct);
      } else if (event.event === "Finished") {
        onProgress?.(100);
      }
    });

    return { success: true };
  } catch (err) {
    console.error("[EasyDebt Tauri] Update installation failed:", err);
    return { success: false, error: String(err) };
  }
}
