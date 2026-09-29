import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/security/permissions";
import { takeSensitiveAttempt } from "@/lib/security/rate-limit";
import {
  assertBackupConfigured,
  BackupError,
  MAX_BACKUP_BYTES,
  openBackup,
  sealBackup,
} from "@/lib/tenant-backup/archive";
import { exportTenant, previewTenant, restoreTenant, validateSnapshot } from "@/lib/tenant-backup/service";

export const runtime = "nodejs";
const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("export"), password: z.string().min(1).max(1024) }).strict(),
  z.object({ action: z.literal("preview"), archive: z.string() }).strict(),
  z
    .object({
      action: z.literal("restore"),
      archive: z.string(),
      password: z.string().min(1).max(1024),
      confirmation: z.string().uuid(),
    })
    .strict(),
]);
async function limitedJson(request: NextRequest) {
  if (!request.body) throw new BackupError("Empty request");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BACKUP_BYTES * 1.5) {
      await reader.cancel();
      throw new BackupError("Request is too large", 413);
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!can(session, "tenant.backup")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    assertBackupConfigured();
    const body = requestSchema.parse(await limitedJson(request));
    if (body.action !== "preview") {
      if (!(await takeSensitiveAttempt(session.userId, "backup")))
        return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
      const actor = await prisma.user.findUnique({ where: { id: session.userId } });
      if (!actor?.is_active || actor.role !== "SUPER_ADMIN" || !(await bcrypt.compare(body.password, actor.password)))
        return NextResponse.json({ error: "Invalid credentials" }, { status: 403 });
    }
    if (body.action === "export") {
      const archive = sealBackup(await exportTenant(session.clientId, session.userId));
      return new NextResponse(archive, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Content-Disposition": `attachment; filename="easydebt-shop-${session.clientId}-${Date.now()}.edbackup"`,
        },
      });
    }
    const snapshot = validateSnapshot(openBackup(body.archive), session.clientId);
    if (body.action === "preview")
      return NextResponse.json(await previewTenant(snapshot), { headers: { "Cache-Control": "no-store" } });
    if (body.confirmation !== snapshot.id) throw new BackupError("Preview confirmation does not match this backup");
    const result = await restoreTenant(snapshot, session.userId);
    return NextResponse.json({ success: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof BackupError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return NextResponse.json({ error: "Invalid backup request" }, { status: 400 });
    console.error("Tenant backup failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Backup operation failed; database changes were not applied" }, { status: 409 });
  }
}
