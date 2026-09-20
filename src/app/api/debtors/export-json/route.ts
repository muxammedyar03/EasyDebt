import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { assertBackupConfigured, BackupError } from "@/lib/tenant-backup/archive";
import { exportTenant } from "@/lib/tenant-backup/service";
import { exportJson } from "@/lib/tenant-backup/json-transfer";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    assertBackupConfigured();
    const snapshot = await exportTenant(requireClientId(session), session.userId);
    return NextResponse.json(exportJson(snapshot, session.username), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof BackupError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Full JSON export failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Full export failed; no partial file was produced" }, { status: 500 });
  }
}
