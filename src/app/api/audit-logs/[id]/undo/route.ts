import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { hasPermission } from "@/lib/security/permission-access";
import { AuditUndoError, undoAuditAction } from "@/lib/audit-undo";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasPermission(session, "audit.undo")))
    return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
  const { id } = await params;
  const auditId = Number(id);
  if (!Number.isSafeInteger(auditId) || auditId <= 0)
    return NextResponse.json({ error: "Noto‘g‘ri ID" }, { status: 400 });
  try {
    const result = await undoAuditAction(requireClientId(session), session.userId, auditId, session.role);
    revalidatePath("/dashboard/audit-logs");
    revalidatePath("/dashboard/default");
    revalidatePath("/dashboard/debtors");
    revalidatePath("/dashboard/my-debts");
    revalidatePath("/dashboard/users");
    return NextResponse.json({ id: result.id, ok: true });
  } catch (error) {
    if (error instanceof AuditUndoError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Audit undo failed:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}
