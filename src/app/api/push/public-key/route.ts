import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push/vapid-keys";

/**
 * GET /api/push/public-key
 * Get VAPID public key for client-side subscription
 */
export async function GET() {
  try {
    const publicKey = getVapidPublicKey();
    return NextResponse.json({ publicKey });
  } catch (error) {
    return NextResponse.json({ error: error || "VAPID keys not configured" }, { status: 500 });
  }
}
