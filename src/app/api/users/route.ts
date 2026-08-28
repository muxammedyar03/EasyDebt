import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const body = await request.json();
    const { username, email, password, role, first_name, last_name, is_active, client_id } = body;

    if (!username || !password || !role) {
      return NextResponse.json({ error: "Username, parol va rol majburiy" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" }, { status: 400 });
    }

    const targetClientId =
      typeof client_id === "number" && Number.isFinite(client_id) ? client_id : requireClientId(session);

    const clientExists = await prisma.client.findUnique({ where: { id: targetClientId } });
    if (!clientExists || !clientExists.is_active) {
      return NextResponse.json({ error: "Client topilmadi" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Bu username allaqachon mavjud" }, { status: 400 });
    }

    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        return NextResponse.json({ error: "Bu email allaqachon mavjud" }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email: email || null,
        password: hashedPassword,
        role,
        first_name: first_name || null,
        last_name: last_name || null,
        is_active: is_active ?? true,
        client_id: targetClientId,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        first_name: true,
        last_name: true,
        is_active: true,
        created_at: true,
        client_id: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("User creation error:", error);
    return NextResponse.json({ error: "Foydalanuvchi yaratishda xatolik" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filterClientId = searchParams.get("client_id");
    const where =
      filterClientId && Number.isFinite(Number(filterClientId)) ? { client_id: Number(filterClientId) } : undefined;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        first_name: true,
        last_name: true,
        is_active: true,
        created_at: true,
        client_id: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ error: "Foydalanuvchilarni yuklashda xatolik" }, { status: 500 });
  }
}
