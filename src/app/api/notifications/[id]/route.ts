import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { markNotificationAsRead } from "@/lib/notifications";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const notificationId = parseInt(id);

    await markNotificationAsRead(notificationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}
