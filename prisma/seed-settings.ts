import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create default debt limit setting
  await prisma.settings.upsert({
    where: { key: "debt_limit" },
    update: {},
    create: {
      key: "debt_limit",
      value: "2000000", // 2 million som default
    },
  });

  // Create default overdue days setting
  await prisma.settings.upsert({
    where: { key: "overdue_days" },
    update: {},
    create: {
      key: "overdue_days",
      value: "45", // 45 days default
    },
  });

  console.log("Settings seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
