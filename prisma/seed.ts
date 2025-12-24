import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Shoplar yaratish
  const shop1 = await prisma.shop.create({
    data: {
      name: "Chilonzor Filiali",
      is_active: true,
      address: "Chilonzor tumani, 15-kvartal",
    },
  });

  const shop2 = await prisma.shop.create({
    data: {
      name: "Yunusobod Filiali",
      is_active: true,
      address: "Yunusobod tumani, 7-kvartal",
    },
  });

  const shop3 = await prisma.shop.create({
    data: {
      name: "Test Shop (Inactive)",
      is_active: false,
      address: "Test manzil",
    },
  });

  console.log("✅ Shoplar yaratildi:", { shop1: shop1.name, shop2: shop2.name });

  // 2. Userlar yaratish
  const hashedPassword = await bcrypt.hash("123456", 10);
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
      username: "admin_chilonzor",
      email: "admin@chilonzor.com",
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
      username: "kassir_chilonzor",
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
      username: "admin_yunusobod",
      email: "admin@yunusobod.com",
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
      username: "blocked_user",
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
      first_name: "Alisher",
      last_name: "Navoiy",
      phone_number: "+998901234567",
      address: "Chilonzor, 5-kvartal",
      total_debt: 2500000,
      created_by: admin1.id,
    },
  });

  const debtor2 = await prisma.debtor.create({
    data: {
      shop_id: shop1.id,
      first_name: "Zulfiya",
      last_name: "Karimova",
      phone_number: "+998907654321",
      address: "Chilonzor, 10-kvartal",
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
      description: "Telefon Samsung A54",
      items: JSON.stringify([{ name: "Samsung A54", price: 1500000, quantity: 1 }]),
      created_by: admin1.id,
    },
  });

  await prisma.debt.create({
    data: {
      shop_id: shop1.id,
      debtor_id: debtor1.id,
      amount: 1000000,
      description: "Noutbuk aksessuarlari",
      items: JSON.stringify([
        { name: "Sumka", price: 300000, quantity: 1 },
        { name: "Sichqoncha", price: 200000, quantity: 1 },
        { name: "Klaviatura", price: 500000, quantity: 1 },
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
      first_name: "Rustam",
      last_name: "Sobirov",
      phone_number: "+998911234567",
      address: "Yunusobod, 3-kvartal",
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
      shop_id: shop1.id,
      user_id: admin1.id,
      action: "CREATE_DEBTOR",
      entity_type: "Debtor",
      entity_id: debtor1.id,
      new_value: { first_name: "Alisher", last_name: "Navoiy" },
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
