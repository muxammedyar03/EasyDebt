import { deleteEmptyRecords, RecordDeletionError } from "@/lib/security/delete-records";
import { can } from "@/lib/security/permissions";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/errors";
import { companyService } from "@/lib/services/company.service";

const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  contact_person: z.string().nullable().optional(),
  phone_number: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const { id } = await params;
    const companyId = parseInt(id, 10);
    if (isNaN(companyId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const domain = await companyService.findById(clientId, companyId, true);
    if (!domain) {
      return NextResponse.json({ error: "Kompaniya topilmadi" }, { status: 404 });
    }

    return NextResponse.json(domain);
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const { id } = await params;
    const companyId = parseInt(id, 10);
    if (isNaN(companyId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const body = await request.json();
    const validated = updateCompanySchema.parse(body);

    const updated = await companyService.update(
      clientId,
      companyId,
      {
        name: validated.name,
        contactPerson: validated.contact_person,
        phoneNumber: validated.phone_number,
        address: validated.address,
      },
      session.userId,
    );

    revalidatePath("/dashboard/my-debts");
    revalidatePath(`/dashboard/my-debts/${updated.externalId}`);

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors }, { status: 400 });
    }
    console.error("Error updating company:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!can(session, "records.delete")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const clientId = requireClientId(session);

    const { id } = await params;
    const companyId = parseInt(id, 10);
    if (isNaN(companyId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const company = await companyService.findById(clientId, companyId, false);
    if (!company) {
      return NextResponse.json({ error: "Kompaniya topilmadi" }, { status: 404 });
    }

    await deleteEmptyRecords("company", clientId, [companyId], session.userId);

    revalidatePath("/dashboard/my-debts");

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof RecordDeletionError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Error deleting company:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
