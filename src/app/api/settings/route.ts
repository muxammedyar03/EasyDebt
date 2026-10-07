import { hasPermission } from "@/lib/security/permission-access";
import { can } from "@/lib/security/permissions";
import { NextRequest, NextResponse } from "next/server";
import { createRequiredAuditLog } from "@/lib/audit";
import { serializableTransaction } from "@/lib/security/serializable";
import { settingsRepository } from "@/entities/settings/api";
import { getApiErrorMessage } from "@/lib/errors";
import { reEvaluateOverdueDebtors } from "@/lib/overdue-checker";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "settings.manage")))
      return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!can(session, "settings.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const clientId = requireClientId(session);
    const { key, value } = await request.json();

    const numeric = typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
    const valid =
      key === "debt_limit"
        ? Number.isFinite(numeric) && numeric >= 0 && numeric <= 99999999.99
        : key === "overdue_days"
          ? Number.isInteger(numeric) && numeric >= 1 && numeric <= 3650
          : false;
    if (!valid) {
      return NextResponse.json({ error: "Key and value are required" }, { status: 400 });
    }

    const setting = await serializableTransaction(async (tx) => {
      const oldSettings = await settingsRepository.findByKey(clientId, key, tx);
      const updated = await settingsRepository.upsert(clientId, key, value, tx);
      const keyName = key === "debt_limit" ? "Qarz limiti" : "Muddati o'tish kuni";
      await createRequiredAuditLog(tx, {
        clientId,
        userId: session.userId,
        action: "UPDATE",
        entityType: "SETTINGS",
        entityId: updated.id,
        oldValue: { key, value: oldSettings?.value ?? null },
        newValue: { key, value },
        description: `${keyName} - "${oldSettings?.value ?? "mavjud emas"}" dan "${value}" ga o'zgartirildi`,
        ipAddress: request.headers.get("cf-connecting-ip") || "",
        userAgent: request.headers.get("user-agent") || "",
      });
      return updated;
    });

    if (key === "overdue_days") {
      try {
        await reEvaluateOverdueDebtors(clientId);
        // Invalidate dashboard pages so the new statuses show up
        revalidatePath("/dashboard/default");
        revalidatePath("/dashboard/debtors");
        revalidatePath("/dashboard");
      } catch (e) {
        console.error("Failed to re-evaluate overdue debtors after settings update:", e);
      }
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error("Error saving setting:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "settings.view")))
      return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clientId = requireClientId(session);

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (key) {
      const setting = await settingsRepository.findByKey(clientId, key);
      return NextResponse.json(setting);
    }

    const settings = await settingsRepository.findMany(clientId);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
