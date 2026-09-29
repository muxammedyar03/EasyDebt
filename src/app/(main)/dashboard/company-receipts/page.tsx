import { hasPermission } from "@/lib/security/permission-access";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { CompanyReceiptsClient } from "./_components/company-receipts-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CompanyReceiptsPage() {
  const session = await getSession();
  if (!session || !(await hasPermission(session, "company-receipts.view"))) {
    redirect("/unauthorized");
  }

  return <CompanyReceiptsClient />;
}

