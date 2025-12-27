import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getEffectiveShopId } from "@/lib/shop-context";
import { reEvaluateOverdueDebtors } from "@/lib/overdue-checker";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { key, value } = await request.json();

    if (!key || !value) {
      return NextResponse.json({ error: "Key and value are required" }, { status: 400 });
    }

    const shopId = getEffectiveShopId(session);
    if (!shopId) {
      return NextResponse.json({ error: "Shop context not found" }, { status: 400 });
    }
    const oldSettings = await prisma.settings.findUnique({
      where: { shop_id_key: { shop_id: shopId, key } },
    });

    const setting = await prisma.settings.upsert({
      where: { shop_id_key: { shop_id: shopId, key } },
      update: { value },
      create: { shop_id: shopId, key, value },
    });

    const oldValue = oldSettings?.value || "mavjud emas";
    const keyName = key === "debt_limit" ? "Qarz limiti" : key === "overdue_days" ? "Muddati o'tish kuni" : key;
    const description = `${keyName} - "${oldValue}" dan "${value}" ga o'zgartirildi`;

    await prisma.auditLog.create({
      data: {
        user_id: session.userId,
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
        await reEvaluateOverdueDebtors();
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
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = getEffectiveShopId(session);
    if (!shopId) {
      return NextResponse.json({ error: "Shop context not found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (key) {
      const setting = await prisma.settings.findUnique({
        where: { shop_id_key: { shop_id: shopId, key } },
      });
      return NextResponse.json(setting);
    }

    const settings = await prisma.settings.findMany({
      where: { shop_id: shopId },
    });
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}
