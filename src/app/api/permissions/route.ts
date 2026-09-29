import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/security/permission-access";
import { isPermissionKey, PERMISSION_KEYS } from "@/lib/security/permission-catalog";

const updateSchema = z.object({
  scope: z.enum(["platform", "client", "user"]),
  clientId: z.number().int().positive().optional(),
  userId: z.number().int().positive().optional(),
  changes: z.array(z.object({ key: z.string(), enabled: z.boolean() })).min(1).max(PERMISSION_KEYS.length),
}).strict();

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !(await hasPermission(session, "permissions.view"))) {
    return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
  }
  const selected = Number(new URL(request.url).searchParams.get("clientId") || session.clientId);
  if (!Number.isSafeInteger(selected) || selected < 1 || (session.role !== "SUPER_ADMIN" && selected !== session.clientId))
    return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });

  const [clients, users, platform, client, user] = await Promise.all([
    session.role === "SUPER_ADMIN"
      ? prisma.client.findMany({ select: { id: true, name: true, slug: true, is_active: true }, orderBy: { name: "asc" } })
      : prisma.client.findMany({ where: { id: selected }, select: { id: true, name: true, slug: true, is_active: true } }),
    prisma.user.findMany({
      where: { client_id: selected, role: { not: "SUPER_ADMIN" } },
      select: { id: true, username: true, first_name: true, last_name: true, role: true, is_active: true },
      orderBy: { username: "asc" },
    }),
    prisma.platformPermission.findMany({ select: { key: true, enabled: true } }),
    prisma.clientPermission.findMany({ where: { client_id: selected }, select: { key: true, enabled: true } }),
    prisma.userPermission.findMany({
      where: { client_id: selected, user: { role: { not: "SUPER_ADMIN" } } },
      select: { key: true, enabled: true, user_id: true },
    }),
  ]);
  return NextResponse.json({
    clients, users, selectedClientId: selected, platform, client, user,
    canManage: session.role === "SUPER_ADMIN" || (session.role === "ADMIN" && await hasPermission(session, "permissions.manage")),
    canManageClient: session.role === "SUPER_ADMIN",
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(session.role) || !(await hasPermission(session, "permissions.manage")))
    return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
  let parsed: z.infer<typeof updateSchema>;
  try {
    parsed = updateSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Noto‘g‘ri ma’lumot" }, { status: 400 });
  }
  const { scope, changes, userId } = parsed;
  const clientId = parsed.clientId ?? session.clientId;
  if ((scope !== "user" && userId != null) || (scope === "user" && userId == null) ||
      (scope !== "platform" && (!Number.isSafeInteger(clientId) || clientId < 1)) ||
      (session.role !== "SUPER_ADMIN" && (scope !== "user" || clientId !== session.clientId)) ||
      changes.some(({ key }) => !isPermissionKey(key)) ||
      new Set(changes.map(({ key }) => key)).size !== changes.length ||
      (scope === "platform" && changes.some(({ key, enabled }) =>
        !enabled && ["permissions.view", "permissions.manage", "clients.view"].includes(key))))
    return NextResponse.json({ error: "Ruxsat yoki permission ro‘yxati noto‘g‘ri" }, { status: 403 });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(20260930, 1)`;
      if (scope !== "platform") {
        const shop = await tx.client.findUnique({ where: { id: clientId }, select: { is_active: true } });
        if (!shop?.is_active) throw new Error("SHOP_UNAVAILABLE");
      }
      if (scope === "user") {
        const target = await tx.user.findFirst({
          where: { id: userId, client_id: clientId, role: { not: "SUPER_ADMIN" } },
          select: { id: true, role: true },
        });
        if (!target) throw new Error("USER_UNAVAILABLE");
        if (target.role === "USER" && changes.some(({ key, enabled }) => enabled &&
          (key.startsWith("users.") || key.startsWith("permissions."))))
          throw new Error("PARENT_DENIED");
      }
      for (const { key, enabled } of changes) {
        if (scope === "user" && enabled) {
          const [platform, shop] = await Promise.all([
            tx.platformPermission.findUnique({ where: { key }, select: { enabled: true } }),
            tx.clientPermission.findUnique({ where: { client_id_key: { client_id: clientId, key } }, select: { enabled: true } }),
          ]);
          if (platform?.enabled === false || shop?.enabled === false ||
              ["clients.view", "clients.manage", "tenant.backup", "company-receipts.view"].includes(key))
            throw new Error("PARENT_DENIED");
        }
        const before = scope === "platform" ? await tx.platformPermission.findUnique({ where: { key } }) :
          scope === "client" ? await tx.clientPermission.findUnique({ where: { client_id_key: { client_id: clientId, key } } }) :
          await tx.userPermission.findUnique({ where: { user_id_key: { user_id: userId!, key } } });
        if (scope === "platform") {
          await tx.platformPermission.upsert({ where: { key }, create: { key, enabled }, update: { enabled } });
        } else if (scope === "client") {
          await tx.clientPermission.upsert({
            where: { client_id_key: { client_id: clientId, key } },
            create: { client_id: clientId, key, enabled }, update: { enabled },
          });
        } else {
          await tx.userPermission.upsert({
            where: { user_id_key: { user_id: userId!, key } },
            create: { client_id: clientId, user_id: userId!, key, enabled }, update: { enabled },
          });
        }
        await tx.auditLog.create({
          data: {
            client_id: scope === "platform" ? session.clientId : clientId,
            user_id: session.userId,
            action: "UPDATE", entity_type: "PERMISSION",
            entity_id: scope === "user" ? userId : scope === "client" ? clientId : null,
            description: `${scope} permission ${key}`,
            old_value: { enabled: before?.enabled ?? null },
            new_value: { enabled, scope, key },
          },
        });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && ["SHOP_UNAVAILABLE", "USER_UNAVAILABLE", "PARENT_DENIED"].includes(error.message))
      return NextResponse.json({ error: "Magazin, xodim yoki yuqori darajadagi ruxsat topilmadi" }, { status: 409 });
    console.error("Permission update failed", error);
    return NextResponse.json({ error: "Saqlashda xatolik" }, { status: 500 });
  }
}
