import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { seedClientSettings, slugifyClientName } from "@/lib/clients/seed-client-settings";

const createClientSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(48).optional(),
});

export async function GET() {
  try {
    const session = await getSession();
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

    const client = await prisma.client.create({
      data: {
        name: parsed.name.trim(),
        slug,
        is_active: true,
      },
    });

    await seedClientSettings(client.id);

    await createAuditLog({
      userId: session.userId,
      clientId: client.id,
      action: "CREATE",
      entityType: "CLIENT",
      entityId: client.id,
      newValue: { id: client.id, name: client.name, slug: client.slug },
      description: `Client yaratildi: ${client.name}`,
      ipAddress: req.headers.get("cf-connecting-ip") || "",
      userAgent: req.headers.get("user-agent") || "",
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
