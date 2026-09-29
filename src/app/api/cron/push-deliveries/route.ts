import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { processPushDeliveries } from "@/lib/push/outbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = verifyCronAuth(request);
  if (!auth.authorized) return auth.error;
  try {
    return NextResponse.json({ success: true, processed: await processPushDeliveries() });
  } catch (error) {
    console.error("[push-deliveries] Worker failed:", error);
    return NextResponse.json({ error: "Push worker failed; leased jobs will be retried" }, { status: 500 });
  }
}
