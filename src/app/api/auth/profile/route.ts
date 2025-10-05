import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { first_name, last_name, username, email } = body;

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser && existingUser.id !== session.userId) {
        return NextResponse.json(
          { error: "Bu username allaqachon band" },
          { status: 400 }
        );
      }
    }

    // Check if email is already taken by another user
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail && existingEmail.id !== session.userId) {
        return NextResponse.json(
          { error: "Bu email allaqachon band" },
          { status: 400 }
        );
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        first_name,
        last_name,
        username,
        email,
      },
      select: {
        id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
      },
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
