import { notFound } from "next/navigation";
import { companyService } from "@/lib/services/company.service";
import { CompanyDetailClient } from "./_components/company-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CompanyDetailPage({ params }: PageProps) {
  const { id } = await params;

  if (!id || !UUID_REGEX.test(id)) {
    notFound();
  }

  const company = await companyService.findByExternalId(id, true);
  if (!company) {
    notFound();
  }

  return <CompanyDetailClient company={company} />;
}
