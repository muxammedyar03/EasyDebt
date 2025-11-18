import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reEvaluateOverdueDebtors } from "@/lib/overdue-checker";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const { key, value } = await request.json();

    if (!key || !value) {
      return NextResponse.json({ error: "Key and value are required" }, { status: 400 });
    }

    const setting = await prisma.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
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
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (key) {
      const setting = await prisma.settings.findUnique({
        where: { key },
      });
      return NextResponse.json(setting);
    }

    const settings = await prisma.settings.findMany();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}
