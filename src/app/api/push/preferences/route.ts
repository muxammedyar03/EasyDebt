import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/lib/notifications";

const notificationTypes: NotificationType[] = [
  "OVERDUE_PAYMENT",
  "PAYMENT_RECEIVED",
  "DEBT_ADDED",
  "DEBT_LIMIT_EXCEEDED",
  "HOSTING_REMINDER",
  "PAYMENT_REMINDER",
];

const updatePreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  notification_types: z.array(z.enum(notificationTypes as [NotificationType, ...NotificationType[]])).optional(),
});

/**
 * GET /api/push/preferences
 * Get user's push notification preferences
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userPushPreferences = (
      prisma as { userPushPreferences?: { findUnique: (args: unknown) => Promise<unknown | null> } }
    ).userPushPreferences;
    if (!userPushPreferences?.findUnique) {
      return NextResponse.json({ enabled: false, notification_types: [] });
    }

    const preferences = await prisma.userPushPreferences.findUnique({
      where: { user_id: session.userId },
    });

    if (!preferences) {
      return NextResponse.json({
        enabled: false,
        notification_types: [],
      });
    }

    return NextResponse.json({
      enabled: preferences.enabled,
      notification_types: (preferences.notification_types as NotificationType[]) || [],
    });
  } catch (error) {
    console.error("Error getting push preferences:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/push/preferences
 * Update user's push notification preferences
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(prisma as { userPushPreferences?: unknown }).userPushPreferences) {
      return NextResponse.json({ error: "Push preferences not available" }, { status: 503 });
    }

    const body = await request.json();
    const validatedData = updatePreferencesSchema.parse(body);

    // Upsert preferences
    const preferences = await prisma.userPushPreferences.upsert({
      where: { user_id: session.userId },
      create: {
        user_id: session.userId,
        enabled: validatedData.enabled ?? false,
        notification_types: (validatedData.notification_types || []) as NotificationType[],
      },
      update: {
        ...(validatedData.enabled !== undefined && { enabled: validatedData.enabled }),
        ...(validatedData.notification_types !== undefined && {
          notification_types: validatedData.notification_types as NotificationType[],
        }),
      },
    });

    return NextResponse.json({
      enabled: preferences.enabled,
      notification_types: (preferences.notification_types as NotificationType[]) || [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid preferences data", details: error.errors }, { status: 400 });
    }
    console.error("Error updating push preferences:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
