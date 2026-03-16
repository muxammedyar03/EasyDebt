import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Test userlarini tekshirish (seed tomonidan yaratiladigan)
  const seedUsernames = ["superadmin", "admin1", "kassir1", "admin2", "blocked_user"];

  const existingSeedUsers = await prisma.user.findMany({
    where: { username: { in: seedUsernames } },
    select: { username: true },
  });

  if (existingSeedUsers.length > 0) {
    console.log(`⚠️  Seed userlar allaqachon mavjud: ${existingSeedUsers.map((u) => u.username).join(", ")}`);
    console.log("💡 Qayta seed qilish uchun: npx prisma migrate reset");
    console.log("   yoki mavjud userlarni o'chirib qayta ishga tushiring");
    return;
  }

  // Boshqa userlar mavjudligini tekshirish
  const otherUsers = await prisma.user.count();
  if (otherUsers > 0) {
    console.log(`ℹ️  Bazada ${otherUsers} ta boshqa user mavjud. Seed davom ettirilmoqda...`);
  }

  // 1. Shoplar yaratish
  const shop1 = await prisma.shop.create({
    data: {
      name: "Shop 1",
      is_active: true,
      address: "Shop 1 address",
    },
  });

  const shop2 = await prisma.shop.create({
    data: {
      name: "Shop 2",
      is_active: true,
      address: "Shop 2 address",
    },
  });

  const shop3 = await prisma.shop.create({
    data: {
      name: "Shop 3",
      is_active: false,
      address: "Test manzil",
    },
  });

  console.log("✅ Shoplar yaratildi:", { shop1: shop1.name, shop2: shop2.name });

  // 2. Userlar yaratish
  const hashedPassword = await bcrypt.hash("admin1234", 10);
  const hashedPin = await bcrypt.hash("1234", 10);

  // Super Admin (shop_id = null)
  const superAdmin = await prisma.user.create({
    data: {
      username: "superadmin",
      email: "super@admin.com",
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      shop_id: null, // SUPER_ADMIN shopga bog'lanmaydi
      first_name: "Super",
      last_name: "Admin",
      pin: hashedPin,
    },
  });

  // Shop 1 - Admin
  const admin1 = await prisma.user.create({
    data: {
      username: "admin1",
      email: "admin1@example.com",
      password: hashedPassword,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      shop_id: shop1.id,
      first_name: "Jasur",
      last_name: "Adminov",
      pin: hashedPin,
    },
  });

  // Shop 1 - User
  const user1 = await prisma.user.create({
    data: {
      username: "kassir1",
      email: "kassir@chilonzor.com",
      password: hashedPassword,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      shop_id: shop1.id,
      first_name: "Aziza",
      last_name: "Kassirova",
    },
  });

  // Shop 2 - Admin
  const admin2 = await prisma.user.create({
    data: {
      username: "admin1",
      email: "admin1@example.com",
      password: hashedPassword,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      shop_id: shop2.id,
      first_name: "Kamol",
      last_name: "Rahimov",
      pin: hashedPin,
    },
  });

  // Shop 2 - Blocked User (test uchun)
  const blockedUser = await prisma.user.create({
    data: {
      username: "user2",
      email: "blocked@test.com",
      password: hashedPassword,
      role: UserRole.USER,
      status: UserStatus.BLOCKED,
      shop_id: shop2.id,
      first_name: "Blocked",
      last_name: "User",
    },
  });

  console.log("✅ Userlar yaratildi");

  // 3. Shop 1 uchun test ma'lumotlar
  const debtor1 = await prisma.debtor.create({
    data: {
      shop_id: shop1.id,
      first_name: "Debtor 1",
      last_name: "Debtor 1",
      phone_number: "+998901234567",
      address: "Debtor 1 address",
      total_debt: 2500000,
      created_by: admin1.id,
    },
  });

  const debtor2 = await prisma.debtor.create({
    data: {
      shop_id: shop1.id,
      first_name: "Debtor 2",
      last_name: "Debtor 2",
      phone_number: "+998907654321",
      address: "Debtor 2 address",
      total_debt: 1800000,
      created_by: user1.id,
    },
  });

  // Shop 1 - Qarzlar
  await prisma.debt.create({
    data: {
      shop_id: shop1.id,
      debtor_id: debtor1.id,
      amount: 1500000,
      description: "Debt 1",
      items: JSON.stringify([{ name: "Samsung A54", price: 1500000, quantity: 1 }]),
      created_by: admin1.id,
    },
  });

  await prisma.debt.create({
    data: {
      shop_id: shop1.id,
      debtor_id: debtor1.id,
      amount: 1000000,
      description: "Debt 2",
      items: JSON.stringify([
        { name: "Debt 2 item 1", price: 300000, quantity: 1 },
        { name: "Debt 2 item 2", price: 200000, quantity: 1 },
        { name: "Debt 2 item 3", price: 500000, quantity: 1 },
      ]),
      created_by: user1.id,
    },
  });

  // Shop 1 - To'lovlar
  await prisma.payment.create({
    data: {
      shop_id: shop1.id,
      debtor_id: debtor1.id,
      amount: 500000,
      payment_type: "CASH",
      note: "Qisman to'lov",
      created_by: user1.id,
    },
  });

  // 4. Shop 2 uchun test ma'lumotlar
  const debtor3 = await prisma.debtor.create({
    data: {
      shop_id: shop2.id,
      first_name: "Debtor 3",
      last_name: "Debtor 3",
      phone_number: "+998911234567",
      address: "Debtor 3 address",
      total_debt: 3200000,
      is_overdue: true,
      created_by: admin2.id,
    },
  });

  await prisma.debt.create({
    data: {
      shop_id: shop2.id,
      debtor_id: debtor3.id,
      amount: 3200000,
      description: "iPhone 13 Pro",
      created_by: admin2.id,
    },
  });

  // 5. Global Settings (shop_id = null)
  await prisma.settings.create({
    data: {
      key: "system_version",
      value: "2.0.0",
      shop_id: null,
    },
  });

  await prisma.settings.create({
    data: {
      key: "maintenance_mode",
      value: "false",
      shop_id: null,
    },
  });

  // 6. Shop-specific settings
  await prisma.settings.create({
    data: {
      shop_id: shop1.id,
      key: "debt_limit",
      value: "5000000",
    },
  });

  await prisma.settings.create({
    data: {
      shop_id: shop2.id,
      key: "debt_limit",
      value: "10000000",
    },
  });

  // Shop 3 (inactive) settings
  await prisma.settings.create({
    data: {
      shop_id: shop3.id,
      key: "debt_limit",
      value: "3000000",
    },
  });

  // 7. Audit Log examples
  await prisma.auditLog.create({
    data: {
      shop_id: null,
      user_id: superAdmin.id,
      action: "CREATE_SHOP",
      entity_type: "Shop",
      entity_id: shop1.id,
      new_value: { name: "Chilonzor Filiali" },
    },
  });

  await prisma.auditLog.create({
    data: {
      shop_id: null,
      user_id: superAdmin.id,
      action: "CREATE_SHOP",
      entity_type: "Shop",
      entity_id: shop3.id,
      new_value: { name: "Test Shop (Inactive)", is_active: false },
    },
  });

  await prisma.auditLog.create({
    data: {
      shop_id: shop1.id,
      user_id: admin1.id,
      action: "CREATE_DEBTOR",
      entity_type: "Debtor",
      entity_id: debtor1.id,
      new_value: { first_name: "Alisher", last_name: "Navoiy" },
    },
  });

  // Blocked user audit log
  await prisma.auditLog.create({
    data: {
      shop_id: shop2.id,
      user_id: admin2.id,
      action: "BLOCK_USER",
      entity_type: "User",
      entity_id: blockedUser.id,
      old_value: { status: "ACTIVE" },
      new_value: { status: "BLOCKED" },
    },
  });

  // 8. Notifications
  await prisma.notification.create({
    data: {
      shop_id: shop1.id,
      user_id: admin1.id,
      debtor_id: debtor1.id,
      type: "OVERDUE_PAYMENT",
      title: "To'lov muddati o'tgan",
      message: "Alisher Navoiyning qarzi muddati o'tgan",
    },
  });

  await prisma.notification.create({
    data: {
      shop_id: shop2.id,
      user_id: admin2.id,
      type: "DEBT_LIMIT_EXCEEDED",
      title: "Qarz limiti oshgan",
      message: "Rustam Sobirov qarz limiti oshgan",
    },
  });

  console.log("✅ Barcha test ma'lumotlar yaratildi!");
  console.log("\n📋 Login ma'lumotlari:");
  console.log("Super Admin: superadmin / 123456 (PIN: 1234)");
  console.log("Shop 1 Admin: admin_chilonzor / 123456 (PIN: 1234)");
  console.log("Shop 1 User: kassir_chilonzor / 123456");
  console.log("Shop 2 Admin: admin_yunusobod / 123456 (PIN: 1234)");
  console.log("Blocked User: blocked_user / 123456");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed xatoligi:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
