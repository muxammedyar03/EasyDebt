import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runCustomMigrations } from "@/lib/migrations";

/**
 * Migration API Endpoint
 *
 * Security: Requires MIGRATION_SECRET in production
 *
 * Usage:
 *   curl -X POST https://your-domain.com/api/migrate \
 *     -H "Content-Type: application/json" \
 *     -d '{"authorization": "your-secret"}'
 */
export async function POST(request: Request) {
  // Security check for production
  if (process.env.NODE_ENV === "production") {
    try {
      const body = await request.json();
      const { authorization } = body;

      if (!authorization || authorization !== process.env.MIGRATION_SECRET) {
        return NextResponse.json({ error: "Unauthorized - Invalid migration secret" }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
  }

  try {
    console.log("🚀 Running migrations via API...");
    await runCustomMigrations(prisma);

    return NextResponse.json({
      success: true,
      message: "All migrations completed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Migration failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// GET endpoint to check migration status
export async function GET() {
  try {
    const migrations = await prisma.$queryRaw<Array<{ id: number; name: string; created_at: Date }>>`
      SELECT id, name, created_at 
      FROM _custom_migrations 
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    return NextResponse.json({
      success: true,
      count: migrations.length,
      latest: migrations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
