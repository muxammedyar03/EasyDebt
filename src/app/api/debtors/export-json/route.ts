import { hasPermission } from "@/lib/security/permission-access";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { assertBackupConfigured, BackupError } from "@/lib/tenant-backup/archive";
import { ExportDiagnosticError, exportTenant } from "@/lib/tenant-backup/service";
import { exportJson } from "@/lib/tenant-backup/json-transfer";

export async function GET() {
  let stage = "authorization";
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "debtors.export")))
      return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    assertBackupConfigured();
    stage = "snapshot";
    const snapshot = await exportTenant(requireClientId(session), session.userId);
    stage = "archive";
    return NextResponse.json(exportJson(snapshot, session.username), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof BackupError) return NextResponse.json({ error: error.message }, { status: error.status });
    const failedStage = error instanceof ExportDiagnosticError ? error.stage : stage;
    const cause = error instanceof ExportDiagnosticError ? error.cause : error;
    const code =
      cause && typeof cause === "object" && "code" in cause && typeof cause.code === "string"
        ? cause.code.replace(/[^A-Z0-9]/g, "").slice(0, 12)
        : undefined;
    // Stage and Prisma code contain no customer data; the underlying message stays in server logs.
    console.error("Full JSON export failed", { stage: failedStage, code, error: cause });
    return NextResponse.json(
      { error: `Full export failed (${failedStage}${code ? `, ${code}` : ""}); no partial file was produced` },
      { status: 500 },
    );
  }
}
