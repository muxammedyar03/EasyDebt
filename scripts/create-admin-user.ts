/**
 * Dev foydalanuvchilarni yaratish: admin + demo guest (Login as Guest).
 * Run: npm run db:seed
 */

import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(params: {
  username: string;
  password: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
}) {
  const hashedPassword = await bcrypt.hash(params.password, 10);
  return prisma.user.upsert({
    where: { username: params.username },
    update: { password: hashedPassword, is_active: true },
    create: {
      username: params.username,
      email: params.email,
      password: hashedPassword,
      role: params.role,
      first_name: params.first_name,
      last_name: params.last_name,
      is_active: true,
    },
  });
}

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";

  const admin = await upsertUser({
    username: adminUsername,
    password: adminPassword,
    email: adminEmail,
    role: UserRole.ADMIN,
    first_name: "Admin",
    last_name: "User",
  });

  const guest = await upsertUser({
    username: "guest",
    password: "guest123",
    email: "guest@example.com",
    role: UserRole.USER,
    first_name: "Demo",
    last_name: "Guest",
  });

  console.log("✅ Dev foydalanuvchilar tayyor");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Admin  — username: ${admin.username}, password: ${adminPassword}`);
  console.log(`Guest  — username: ${guest.username}, password: guest123`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nLogin: http://localhost:3000/auth/v2/login");
}

main()
  .catch((e) => {
    console.error("Error creating users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
