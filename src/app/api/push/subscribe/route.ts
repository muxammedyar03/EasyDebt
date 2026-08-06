import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

/**
 * POST /api/push/subscribe
 * Subscribe user to push notifications
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(prisma as { pushSubscription?: unknown }).pushSubscription) {
      return NextResponse.json({ error: "Push notifications not available" }, { status: 503 });
    }

    const body = await request.json();
    const validatedData = subscribeSchema.parse(body);

    // Check if subscription already exists
    const existing = await prisma.pushSubscription.findUnique({
      where: {
        user_id_endpoint: {
          user_id: session.userId,
          endpoint: validatedData.endpoint,
        },
      },
    });

    if (existing) {
      // Update existing subscription
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: {
          p256dh: validatedData.keys.p256dh,
          auth: validatedData.keys.auth,
        },
      });
      return NextResponse.json({ success: true, message: "Subscription updated" });
    }

    // Create new subscription
    await prisma.pushSubscription.create({
      data: {
        user_id: session.userId,
        endpoint: validatedData.endpoint,
        p256dh: validatedData.keys.p256dh,
        auth: validatedData.keys.auth,
      },
    });

    return NextResponse.json({ success: true, message: "Subscription created" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid subscription data", details: error.errors }, { status: 400 });
    }
    console.error("Error subscribing to push notifications:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/push/subscribe
 * Unsubscribe user from push notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(prisma as { pushSubscription?: unknown }).pushSubscription) {
      return NextResponse.json({ error: "Push notifications not available" }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });
    }

    // Delete subscription
    await prisma.pushSubscription.deleteMany({
      where: {
        user_id: session.userId,
        endpoint: endpoint,
      },
    });

    return NextResponse.json({ success: true, message: "Unsubscribed" });
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * GET /api/push/subscribe
 * Get user's subscription status
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Guard: push models may be missing if migration not run or client stale
    const pushSubscription = (prisma as { pushSubscription?: { findMany: (args: unknown) => Promise<unknown[]> } })
      .pushSubscription;
    const userPushPreferences = (
      prisma as { userPushPreferences?: { findUnique: (args: unknown) => Promise<unknown | null> } }
    ).userPushPreferences;

    if (!pushSubscription?.findMany || !userPushPreferences?.findUnique) {
      return NextResponse.json({
        subscribed: false,
        subscriptionCount: 0,
        subscriptions: [],
        preferences: { enabled: false, notificationTypes: [] },
      });
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { user_id: session.userId },
      select: {
        id: true,
        endpoint: true,
        created_at: true,
      },
    });

    const preferences = await prisma.userPushPreferences.findUnique({
      where: { user_id: session.userId },
    });

    return NextResponse.json({
      subscribed: subscriptions.length > 0,
      subscriptionCount: subscriptions.length,
      subscriptions: subscriptions,
      preferences: preferences
        ? {
            enabled: preferences.enabled,
            notificationTypes: preferences.notification_types,
          }
        : null,
    });
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
