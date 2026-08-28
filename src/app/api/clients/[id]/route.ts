import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAuditLog } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateClientSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateClientSchema.parse(body);

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(parsed.name !== undefined ? { name: parsed.name.trim() } : {}),
        ...(parsed.is_active !== undefined ? { is_active: parsed.is_active } : {}),
      },
    });

    await createAuditLog({
      userId: session.userId,
      clientId: client.id,
      action: "UPDATE",
      entityType: "CLIENT",
      entityId: client.id,
      oldValue: { name: existing.name, is_active: existing.is_active },
      newValue: { name: client.name, is_active: client.is_active },
      description: `Magazin yangilandi: ${client.name}`,
      ipAddress: req.headers.get("cf-connecting-ip") || "",
      userAgent: req.headers.get("user-agent") || "",
    });

    return NextResponse.json({ client });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    console.error("Update client error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
