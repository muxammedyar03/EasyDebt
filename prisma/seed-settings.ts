import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const client = await prisma.client.findFirst({ where: { slug: "default" } });
  if (!client) {
    throw new Error("Default client not found — run tenant migration/seed first");
  }

  await prisma.settings.upsert({
    where: { client_id_key: { client_id: client.id, key: "debt_limit" } },
    update: {},
    create: {
      client_id: client.id,
      key: "debt_limit",
      value: "2000000",
    },
  });

  await prisma.settings.upsert({
    where: { client_id_key: { client_id: client.id, key: "overdue_days" } },
    update: {},
    create: {
      client_id: client.id,
      key: "overdue_days",
      value: "45",
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
