import { NextResponse } from "next/server";

import { setAuthCookie, setGuestDemoCookie, signToken } from "@/lib/auth";
import { mockFindUserByUsername } from "@/lib/mock";

export async function POST() {
  try {
    const user = mockFindUserByUsername("guest");
    if (!user) {
      return NextResponse.json({ error: "Guest user not available" }, { status: 500 });
    }

    const token = await signToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    await setAuthCookie(token);
    await setGuestDemoCookie();

    return NextResponse.json({
      message: "Guest login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    });
  } catch (error) {
    console.error("Guest login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
