import { Loader2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
export default async function DashboardLoading() {
  const t = await getTranslations("common");
  return (
    <div role="status" aria-live="polite" className="flex min-h-48 items-center justify-center gap-3 p-6">
      <Loader2 aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
      <span>{t("loading")}</span>
    </div>
  );
}
