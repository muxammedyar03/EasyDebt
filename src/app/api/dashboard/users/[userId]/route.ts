import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const updateUserSchema = z.object({
  email: z.string().email().optional().nullable(),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  status: z.enum(["ACTIVE", "BLOCKED", "DEACTIVATED"]).optional(),
  password: z.string().min(6).optional(),
  shop_id: z.number().int().positive().optional().nullable(),
});

// PATCH - Update user
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only SUPER_ADMIN can update any user
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const body = await req.json();
    const validatedData = updateUserSchema.parse(body);

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id: userIdNum },
      include: {
        shop: {
          select: { id: true, name: true },
        },
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Cannot modify SUPER_ADMIN
    if (existingUser.role === "SUPER_ADMIN") {
      return NextResponse.json(
        {
          error: "Cannot modify Super Admin users",
        },
        { status: 403 },
      );
    }

    // If changing email, check for duplicates
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: validatedData.email,
          id: { not: userIdNum },
        },
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

    // Prepare update data with proper typing
    const updateData: {
      email?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      role?: "ADMIN" | "USER";
      status?: "ACTIVE" | "BLOCKED" | "DEACTIVATED";
      password?: string;
      shop?: { connect: { id: number } } | { disconnect: true };
    } = {};

    // Add fields only if they are defined
    if (validatedData.email !== undefined) updateData.email = validatedData.email;
    if (validatedData.first_name !== undefined) updateData.first_name = validatedData.first_name;
    if (validatedData.last_name !== undefined) updateData.last_name = validatedData.last_name;
    if (validatedData.role !== undefined) updateData.role = validatedData.role;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;

    // Handle shop_id through relation
    if (validatedData.shop_id !== undefined) {
      if (validatedData.shop_id === null) {
        updateData.shop = { disconnect: true };
      } else {
        updateData.shop = { connect: { id: validatedData.shop_id } };
      }
    }

    // Hash password if provided
    if (validatedData.password) {
      updateData.password = await hashPassword(validatedData.password);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userIdNum },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        status: true,
        shop_id: true,
        updated_at: true,
      },
    });

    // Log the update
    await prisma.auditLog.create({
      data: {
        user_id: session.userId,
        shop_id: updatedUser.shop_id,
        action: "UPDATE_USER",
        entity_type: "User",
        entity_id: userIdNum,
        old_value: {
          email: existingUser.email,
          role: existingUser.role,
          status: existingUser.status,
          shop_id: existingUser.shop_id,
        },
        new_value: {
          email: updatedUser.email,
          role: updatedUser.role,
          status: updatedUser.status,
          shop_id: updatedUser.shop_id,
        },
      },
    });

    // If user was blocked/deactivated, log special action
    if (validatedData.status && validatedData.status !== existingUser.status) {
      await prisma.auditLog.create({
        data: {
          user_id: session.userId,
          shop_id: updatedUser.shop_id,
          action:
            validatedData.status === "BLOCKED"
              ? "BLOCK_USER"
              : validatedData.status === "DEACTIVATED"
                ? "DEACTIVATE_USER"
                : "ACTIVATE_USER",
          entity_type: "User",
          entity_id: userIdNum,
          old_value: { status: existingUser.status },
          new_value: { status: validatedData.status },
        },
      });
    }

    return NextResponse.json({
      message: "User updated successfully",
      user: updatedUser,
    });
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

    console.error("Update user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete user
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only SUPER_ADMIN can delete users
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Get user to check
    const user = await prisma.user.findUnique({
      where: { id: userIdNum },
      include: {
        _count: {
          select: {
            created_debtors: true,
            created_debts: true,
            created_payments: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Cannot delete SUPER_ADMIN
    if (user.role === "SUPER_ADMIN") {
      return NextResponse.json(
        {
          error: "Cannot delete Super Admin users",
        },
        { status: 403 },
      );
    }

    // Cannot delete yourself
    if (user.id === session.userId) {
      return NextResponse.json(
        {
          error: "Cannot delete your own account",
        },
        { status: 400 },
      );
    }

    // Check if user has created data
    const hasData =
      user._count.created_debtors > 0 || user._count.created_debts > 0 || user._count.created_payments > 0;

    if (hasData) {
      // Soft delete - just deactivate
      await prisma.user.update({
        where: { id: userIdNum },
        data: { status: "DEACTIVATED" },
      });

      await prisma.auditLog.create({
        data: {
          user_id: session.userId,
          shop_id: user.shop_id,
          action: "SOFT_DELETE_USER",
          entity_type: "User",
          entity_id: userIdNum,
          old_value: {
            username: user.username,
            has_data: true,
          },
        },
      });

      return NextResponse.json({
        message: "User deactivated (has created data)",
        soft_delete: true,
      });
    } else {
      // Hard delete if no data
      await prisma.user.delete({
        where: { id: userIdNum },
      });

      await prisma.auditLog.create({
        data: {
          user_id: session.userId,
          shop_id: user.shop_id,
          action: "DELETE_USER",
          entity_type: "User",
          entity_id: userIdNum,
          old_value: { username: user.username },
        },
      });

      return NextResponse.json({
        message: "User permanently deleted",
        hard_delete: true,
      });
    }
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
