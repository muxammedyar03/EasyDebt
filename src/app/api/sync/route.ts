import { NextRequest, NextResponse } from "next/server";
import {
  getSyncStatusReport,
  runBidirectionalSync,
  clearSyncedOutboxItems,
  retryFailedOutboxItems,
} from "@/lib/sync/sync-engine";
import {
  updateSyncMetadata,
  exportLocalDatabaseSnapshot,
  importLocalDatabaseSnapshot,
  type SerializedLocalDatabase,
} from "@/lib/sync/local-db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("export") === "1") {
    const snapshot = exportLocalDatabaseSnapshot();
    return NextResponse.json(snapshot, {
      headers: {
        "Content-Disposition": `attachment; filename="easydebt-local-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  }

  const status = getSyncStatusReport();
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action as string | undefined;

    if (action === "sync-now") {
      const result = await runBidirectionalSync();
      return NextResponse.json(result);
    }

    if (action === "toggle-offline") {
      const offlineModeForced = Boolean(body.offlineModeForced);
      updateSyncMetadata({ offlineModeForced });
      return NextResponse.json({
        success: true,
        message: offlineModeForced
          ? "Offlayn (lokal) rejim yoqildi. Barcha o'zgarishlar lokal xotiraga va sinxronizatsiya navbatiga yoziladi."
          : "Onlayn sinxronizatsiya rejimi yoqildi.",
        status: getSyncStatusReport(),
      });
    }

    if (action === "update-preferences") {
      const patch: Record<string, unknown> = {};
      if (typeof body.minimizeToTray === "boolean") patch.minimizeToTray = body.minimizeToTray;
      if (typeof body.nativeNotifications === "boolean") patch.nativeNotifications = body.nativeNotifications;
      if (body.thermalPaperWidth === "80mm" || body.thermalPaperWidth === "58mm") {
        patch.thermalPaperWidth = body.thermalPaperWidth;
      }
      if (typeof body.autoSyncIntervalSec === "number") {
        patch.autoSyncIntervalSec = Math.max(10, Math.min(3600, body.autoSyncIntervalSec));
      }
      if (typeof body.remoteServerUrl === "string" && body.remoteServerUrl.trim()) {
        patch.remoteServerUrl = body.remoteServerUrl.trim();
      }
      updateSyncMetadata(patch);
      return NextResponse.json({
        success: true,
        message: "Desktop sozlamalari saqlandi.",
        status: getSyncStatusReport(),
      });
    }

    if (action === "clear-synced") {
      const status = clearSyncedOutboxItems();
      return NextResponse.json({
        success: true,
        message: "Sinxronlangan yozuvlar tarixi tozalandi.",
        status,
      });
    }

    if (action === "retry-failed") {
      retryFailedOutboxItems();
      const result = await runBidirectionalSync();
      return NextResponse.json(result);
    }

    if (action === "import-backup" && body.snapshot) {
      importLocalDatabaseSnapshot(body.snapshot as SerializedLocalDatabase);
      return NextResponse.json({
        success: true,
        message: "Lokal ma'lumotlar zaxira nusxasidan muvaffaqiyatli tiklandi.",
        status: getSyncStatusReport(),
      });
    }

    return NextResponse.json({ error: "Unknown sync action" }, { status: 400 });
  } catch (error) {
    console.error("[API /api/sync] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sinxronizatsiya xatosi" },
      { status: 500 },
    );
  }
}
