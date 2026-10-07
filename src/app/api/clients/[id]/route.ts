import { hasPermission } from "@/lib/security/permission-access";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createRequiredAuditLog } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateClientSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "clients.manage")))
      return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateClientSchema.parse(body);
    const client = await prisma.$transaction(async (tx) => {
      const existing = await tx.client.findUnique({ where: { id } });
      if (!existing) return null;
      const updated = await tx.client.update({
        where: { id },
        data: {
          ...(parsed.name !== undefined ? { name: parsed.name.trim() } : {}),
          ...(parsed.is_active !== undefined ? { is_active: parsed.is_active } : {}),
        },
      });
      await createRequiredAuditLog(tx, {
        userId: session.userId,
        clientId: updated.id,
        action: "UPDATE",
        entityType: "CLIENT",
        entityId: updated.id,
        oldValue: { name: existing.name, is_active: existing.is_active },
        newValue: { name: updated.name, is_active: updated.is_active },
        description: `Magazin yangilandi: ${updated.name}`,
        ipAddress: req.headers.get("cf-connecting-ip") || "",
        userAgent: req.headers.get("user-agent") || "",
      });
      return updated;
    });
    if (!client) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    return NextResponse.json({ client });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    console.error("Update client error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
