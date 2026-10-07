import { hasPermission } from "@/lib/security/permission-access";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { createRequiredAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { seedClientSettings, slugifyClientName } from "@/lib/clients/seed-client-settings";

const createClientSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(48).optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "clients.view")))
      return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const clients = await prisma.client.findMany({
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        is_active: true,
        created_at: true,
        _count: { select: { users: true, debtors: true } },
      },
    });

    return NextResponse.json({ clients });
  } catch (error) {
    console.error("List clients error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "clients.manage")))
      return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createClientSchema.parse(body);
    const baseSlug = parsed.slug?.trim() || slugifyClientName(parsed.name);
    if (!baseSlug) {
      return NextResponse.json({ error: "Slug yaroqsiz" }, { status: 400 });
    }

    let slug = baseSlug;
    let suffix = 1;
    while (await prisma.client.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const client = await prisma.$transaction(async (tx) => {
      const created = await tx.client.create({ data: { name: parsed.name.trim(), slug, is_active: true } });
      await seedClientSettings(created.id, tx);
      await createRequiredAuditLog(tx, {
        userId: session.userId,
        clientId: created.id,
        action: "CREATE",
        entityType: "CLIENT",
        entityId: created.id,
        newValue: { id: created.id, name: created.name, slug: created.slug },
        description: `Client yaratildi: ${created.name}`,
        ipAddress: req.headers.get("cf-connecting-ip") || "",
        userAgent: req.headers.get("user-agent") || "",
      });
      return created;
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    console.error("Create client error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
