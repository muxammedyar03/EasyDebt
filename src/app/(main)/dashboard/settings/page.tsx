import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./_components/settings-form";

export default async function SettingsPage() {
  // Get debt limit from settings
  const debtLimitSetting = await prisma.settings.findUnique({
    where: { key: "debt_limit" },
  });
  
  const debtLimit = debtLimitSetting ? parseFloat(debtLimitSetting.value) : 2000000;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">Sozlamalar</h1>
        <p className="text-muted-foreground">
          Tizim sozlamalarini boshqarish
        </p>
      </div>

      <SettingsForm initialDebtLimit={debtLimit} />
    </div>
  );
}
