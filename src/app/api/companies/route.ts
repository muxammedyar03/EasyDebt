import { hasPermission } from "@/lib/security/permission-access";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/errors";
import { companyService } from "@/lib/services/company.service";
import type { CompanyFilterStatus, CompanySortBy } from "@/types/domain/company.domain";

const createCompanySchema = z.object({
  name: z.string().min(1),
  contact_person: z.string().nullable().optional(),
  phone_number: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "companies.view"))) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const sp = request.nextUrl.searchParams;
    const page = Number(sp.get("page") || 1);
    const limit = Number(sp.get("limit") || 10);
    const search = sp.get("search") || undefined;
    const sortBy = (sp.get("sortBy") as CompanySortBy) || "created_at";
    const sortOrder = sp.get("sortOrder") === "asc" ? "asc" : "desc";
    const status = (sp.get("status") as CompanyFilterStatus) || "all";
    const dateFrom = sp.get("dateFrom") ? new Date(sp.get("dateFrom")!) : undefined;
    const dateTo = sp.get("dateTo") ? new Date(sp.get("dateTo")!) : undefined;
    const minAmount = sp.get("minAmount") ? Number(sp.get("minAmount")) : undefined;
    const maxAmount = sp.get("maxAmount") ? Number(sp.get("maxAmount")) : undefined;

    const result = await companyService.findMany(
      clientId,
      {
        search,
        status,
        dateFrom,
        dateTo,
        minDebt: Number.isFinite(minAmount) ? minAmount : undefined,
        maxDebt: Number.isFinite(maxAmount) ? maxAmount : undefined,
      },
      { page, limit, sortBy, sortOrder },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "companies.create"))) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Tizimga kirishda xatolik. Iltimos, qaytadan kiring." }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const body = await request.json();
    const validated = createCompanySchema.parse(body);

    const company = await companyService.create(clientId, {
      name: validated.name,
      contactPerson: validated.contact_person,
      phoneNumber: validated.phone_number,
      address: validated.address,
      createdBy: session.userId,
    });

    revalidatePath("/dashboard/my-debts");

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors }, { status: 400 });
    }
    console.error("Error creating company:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

