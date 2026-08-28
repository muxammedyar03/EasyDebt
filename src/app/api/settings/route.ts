import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { settingsRepository } from "@/entities/settings/api";
import { getApiErrorMessage } from "@/lib/errors";
import { reEvaluateOverdueDebtors } from "@/lib/overdue-checker";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);
    const { key, value } = await request.json();

    if (!key || !value) {
      return NextResponse.json({ error: "Key and value are required" }, { status: 400 });
    }

    const oldSettings = await settingsRepository.findByKey(clientId, key);
    const setting = await settingsRepository.upsert(clientId, key, value);

    const oldValue = oldSettings?.value || "mavjud emas";
    const keyName = key === "debt_limit" ? "Qarz limiti" : key === "overdue_days" ? "Muddati o'tish kuni" : key;
    const description = `${keyName} - "${oldValue}" dan "${value}" ga o'zgartirildi`;

    await prisma.auditLog.create({
      data: {
        user_id: session.userId,
        client_id: clientId,
        action: "UPDATE",
        entity_type: "SETTINGS",
        old_value: JSON.stringify({ key, value: oldValue }),
        new_value: JSON.stringify({ key, value }),
        description,
        ip_address: request.headers.get("cf-connecting-ip") || "",
        user_agent: request.headers.get("user-agent") || "",
      },
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
