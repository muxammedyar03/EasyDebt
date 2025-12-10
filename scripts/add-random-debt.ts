import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("🔍 Finding debtors with total debt < 100,000...");

  // Find debtors with low debt
  const debtors = await prisma.debtor.findMany({
    where: {
      total_debt: {
        lt: 100000,
      },
    },
  });

  if (debtors.length === 0) {
    console.log("✅ No debtors found with debt < 100,000.");
    return;
  }

  console.log(`Found ${debtors.length} debtors. Adding random debts...`);

  // Find a user to attribute changes to (e.g., guest or admin)
  const user =
    (await prisma.user.findFirst({
      where: { username: "guest" }, // Try guest first
    })) || (await prisma.user.findFirst()); // Fallback to any user

  if (!user) {
    console.error("❌ No user found to attribute debts to!");
    return;
  }

  let updatedCount = 0;

  for (const debtor of debtors) {
    const randomDebtAmount = getRandomInt(50000, 200000);

    // Create new debt
    await prisma.debt.create({
      data: {
        debtor_id: debtor.id,
        amount: randomDebtAmount,
        description: "Auto-generated adjustment debt",
        created_by: user.id,
      },
    });

    // Update debtor total_debt
    // Note: Prisma Decimal arithmetic or simple addition.
    // Since we are fetching and updating, atomic increment would be better but simple update is fine for a script.
    // However, Prisma doesn't support increment for Decimal easily in update without raw query sometimes,
    // but standard update with increment: { ... } works for Int/Float. Decimal support varies but should work.
    // Let's use standard number addition for safety if strict mode is on, or increment.
    // Safest is to let Prisma handle the increment.

    await prisma.debtor.update({
      where: { id: debtor.id },
      data: {
        total_debt: {
          increment: randomDebtAmount,
        },
        // If they had 0 debt, they might now be overdue?
        // Logic: if total_debt > 0 and (now - last_payment > 30 days)...
        // but adding debt doesn't change last_payment_date.
        // We'll just update the debt amount.
      },
    });

    updatedCount++;
    process.stdout.write(".");
  }

  console.log(`\n✅ Successfully added debt to ${updatedCount} debtors.`);
}

main()
  .catch((e) => {
    console.error("Error adding random debts:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
