import { notFound, redirect } from "next/navigation";
import { companyService } from "@/lib/services/company.service";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/security/permission-access";
import { requireClientId } from "@/lib/tenant";
import { CompanyDetailClient } from "./_components/company-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CompanyDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (!(await hasPermission(session, "companies.view"))) redirect("/unauthorized");
  const clientId = requireClientId(session);
  const { id } = await params;

  if (!id || !UUID_REGEX.test(id)) {
    notFound();
  }

  const company = await companyService.findByExternalId(clientId, id, true);
  if (!company) {
    notFound();
  }

  return <CompanyDetailClient company={company} />;
}
