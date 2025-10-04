/**
 * Script to create an admin user for testing
 * Run with: npx ts-node scripts/create-admin-user.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const email = process.env.ADMIN_EMAIL || "admin@example.com";

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    console.log(`❌ User '${username}' already exists!`);
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create admin user
  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      role: "ADMIN",
      first_name: "Admin",
      last_name: "User",
      is_active: true,
    },
  });

  console.log("✅ Admin user created successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Username: ${user.username}`);
  console.log(`Email: ${user.email}`);
  console.log(`Password: ${password}`);
  console.log(`Role: ${user.role}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nYou can now login at: http://localhost:3000/auth/v2/login");
}

main()
  .catch((e) => {
    console.error("Error creating admin user:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
