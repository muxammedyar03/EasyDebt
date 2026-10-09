import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { hasPermission } from "@/lib/security/permission-access";
import { AuditUndoError } from "@/lib/audit-undo";
import { cancelAuditAction } from "@/lib/audit-cancel";

const bodySchema = z.object({ reason: z.string().trim().min(3).max(200) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasPermission(session, "audit.cancel")))
    return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
  const { id } = await params;
  const auditId = Number(id);
  if (!Number.isSafeInteger(auditId) || auditId <= 0)
    return NextResponse.json({ error: "Noto‘g‘ri ID" }, { status: 400 });
  try {
    const { reason } = bodySchema.parse(await request.json());
    const result = await cancelAuditAction(requireClientId(session), session.userId, auditId, reason);
    revalidatePath("/dashboard/audit-logs");
    revalidatePath("/dashboard/default");
    revalidatePath("/dashboard/debtors");
    if ("debtorExternalId" in result) revalidatePath(`/dashboard/default/debitor/${result.debtorExternalId}`);
    revalidatePath("/dashboard/my-debts");
    if ("companyExternalId" in result) revalidatePath(`/dashboard/my-debts/${result.companyExternalId}`);
    revalidatePath("/dashboard/reports");
    return NextResponse.json({ id: result.audit.id, ok: true });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return NextResponse.json({ error: "Bekor qilish sababi noto‘g‘ri" }, { status: 400 });
    if (error instanceof AuditUndoError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return NextResponse.json({ error: "Bu amal allaqachon bekor qilingan" }, { status: 409 });
    console.error("Audit cancellation failed:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}
