import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  role: z.enum(["ADMIN", "USER"]), // SUPER_ADMIN cannot create another SUPER_ADMIN
  status: z.enum(["ACTIVE", "BLOCKED", "DEACTIVATED"]).default("ACTIVE"),
});

// GET - List all users in a shop
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only SUPER_ADMIN can manage shop users
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const shopId = parseInt(id);
    if (isNaN(shopId)) {
      return NextResponse.json({ error: "Invalid shop ID" }, { status: 400 });
    }

    // Check if shop exists
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, name: true },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Get users with stats
    const users = await prisma.user.findMany({
      where: { shop_id: shopId },
      select: {
        id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        status: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            created_debtors: true,
            created_debts: true,
            created_payments: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Get last activity for each user
    const usersWithActivity = await Promise.all(
      users.map(async (user) => {
        const lastActivity = await prisma.auditLog.findFirst({
          where: {
            user_id: user.id,
            shop_id: shopId,
          },
          orderBy: { created_at: "desc" },
          select: {
            action: true,
            created_at: true,
          },
        });

        return {
          ...user,
          last_activity: lastActivity,
        };
      }),
    );

    return NextResponse.json({
      shop: shop,
      users: usersWithActivity,
      total: users.length,
    });
  } catch (error) {
    console.error("Get shop users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new user in shop
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only SUPER_ADMIN can create users in any shop
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const shopId = parseInt(id);
    if (isNaN(shopId)) {
      return NextResponse.json({ error: "Invalid shop ID" }, { status: 400 });
    }

    // Check if shop exists and is active
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, name: true, is_active: true },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    if (!shop.is_active) {
      return NextResponse.json(
        {
          error: "Cannot add users to inactive shop",
        },
        { status: 400 },
      );
    }

    const body = await req.json();
    const validatedData = createUserSchema.parse(body);

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: validatedData.username },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "Username already exists",
        },
        { status: 409 },
      );
    }

    // Check if email already exists
    if (validatedData.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (emailExists) {
        return NextResponse.json(
          {
            error: "Email already registered",
          },
          { status: 409 },
        );
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        first_name: validatedData.first_name,
        last_name: validatedData.last_name,
        role: validatedData.role,
        status: validatedData.status,
        shop_id: shopId,
      },
      select: {
        id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        status: true,
        created_at: true,
      },
    });

    // Log user creation
    await prisma.auditLog.create({
      data: {
        user_id: session.userId,
        shop_id: shopId,
        action: "CREATE_USER",
        entity_type: "User",
        entity_id: newUser.id,
        new_value: {
          username: newUser.username,
          role: newUser.role,
          shop_id: shopId,
        },
      },
    });

    return NextResponse.json(
      {
        message: "User created successfully",
        user: newUser,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    console.error("Create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
