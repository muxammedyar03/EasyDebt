import { prisma } from "./src/lib/prisma";
import { reEvaluateOverdueDebtors } from "./src/lib/overdue-checker";

async function main() {
  console.log("🔍 Testing overdue checker...\n");

  // Run the checker
  await reEvaluateOverdueDebtors();

  // Get all debtors with their status
  const debtors = await prisma.debtor.findMany({
    where: { total_debt: { gt: 0 } },
    include: {
      debts: {
        orderBy: { created_at: "asc" },
      },
    },
    orderBy: { id: "asc" },
  });

  console.log("\n📊 Results:\n");
  console.log("ID | Name       | Total Debt | Oldest Debt Date | Is Overdue | Days Old");
  console.log("---|------------|------------|------------------|------------|----------");

  for (const d of debtors) {
    const oldestDebt = d.debts[0];
    const daysOld = oldestDebt ? Math.floor((Date.now() - oldestDebt.created_at.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    console.log(
      `${d.id.toString().padEnd(2)} | ${d.first_name.padEnd(10)} | ${d.total_debt.toString().padEnd(10)} | ${oldestDebt?.created_at.toISOString().split("T")[0] || "N/A"} | ${d.is_overdue ? "✅ YES" : "❌ NO"} | ${daysOld} days`,
    );
  }

  console.log("\n✅ Test completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
