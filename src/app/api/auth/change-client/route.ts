import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAuditLog } from "@/lib/audit";
import { getSession, setAuthCookie, signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const changeClientSchema = z.object({
  clientId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { clientId } = changeClientSchema.parse(body);

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, slug: true, is_active: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const previousClientId = session.clientId;

    const token = await signToken({
      userId: session.userId,
      username: session.username,
      email: session.email,
      role: session.role,
      clientId: client.id,
    });
    await setAuthCookie(token);

    await createAuditLog({
      userId: session.userId,
      clientId: client.id,
      action: "UPDATE",
      entityType: "CLIENT",
      entityId: client.id,
      oldValue: { clientId: previousClientId },
      newValue: { clientId: client.id, name: client.name },
      description: `Magazin almashtirildi: ${client.name}`,
      ipAddress: req.headers.get("cf-connecting-ip") || "",
      userAgent: req.headers.get("user-agent") || "",
    });

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        slug: client.slug,
        is_active: client.is_active,
      },
      warning: client.is_active ? null : "Bu magazin nofaol",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    console.error("Change client error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
