#!/usr/bin/env tsx
/**
 * Custom Migration Script
 *
 * Usage:
 *   npm run migrate              # Development
 *   npm run migrate:prod         # Production
 */

import { PrismaClient } from "@prisma/client";
import { runCustomMigrations } from "../src/lib/migrations";

const prisma = new PrismaClient();

async function main() {
  const dbUrl = process.env.DATABASE_URL || "";
  const dbHost = dbUrl.split("@")[1]?.split("/")[0] || "unknown";
  const dbName = dbUrl.split("/").pop()?.split("?")[0] || "unknown";

  console.log("🚀 Starting custom migrations...");
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Database: ${dbName} @ ${dbHost}\n`);

  try {
    await runCustomMigrations(prisma);
    console.log("\n✅ All migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
