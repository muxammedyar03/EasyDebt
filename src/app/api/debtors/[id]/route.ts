import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { debtorService } from "@/lib/services/debtor.service";

const updateDebtorSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  phone_number: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

// GET single debtor
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const { id } = await params;
    const debtorId = parseInt(id);
    if (isNaN(debtorId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const domain = await debtorService.findById(clientId, debtorId, true);
    if (!domain) {
      return NextResponse.json({ error: "Qarzdor topilmadi" }, { status: 404 });
    }

    return NextResponse.json(domain);
  } catch (error) {
    console.error("Error fetching debtor:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

// UPDATE debtor
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const { id } = await params;
    const debtorId = parseInt(id);
    if (isNaN(debtorId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateDebtorSchema.parse(body);

    const updated = await debtorService.update(clientId, debtorId, {
      firstName: validatedData.first_name,
      lastName: validatedData.last_name,
      phoneNumber: validatedData.phone_number,
      address: validatedData.address,
    });

    await createAuditLog({
      clientId,
      userId: session.userId,
      action: "UPDATE",
      entityType: "DEBTOR",
      entityId: debtorId,
      newValue: {
        debtor_id: debtorId,
        first_name: validatedData.first_name,
        last_name: validatedData.last_name,
        phone_number: validatedData.phone_number,
        address: validatedData.address,
      },
      description: `Qarzdor ${updated.firstName} ${updated.lastName} ma'lumotlari yangilandi`,
      ipAddress: request.headers.get("cf-connecting-ip") || "",
      userAgent: request.headers.get("user-agent") || "",
    });

    revalidatePath("/dashboard/debtors");
    revalidatePath("/dashboard/default");
    revalidatePath(`/dashboard/default/debitor/${updated.externalId}`);

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors }, { status: 400 });
    }
    console.error("Error updating debtor:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

// DELETE debtor
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const { id } = await params;
    const debtorId = parseInt(id);
    if (isNaN(debtorId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const debtor = await debtorService.findById(clientId, debtorId, false);
    if (!debtor) {
      return NextResponse.json({ error: "Qarzdor topilmadi" }, { status: 404 });
    }

    await createAuditLog({
      clientId,
      userId: session.userId,
      action: "DELETE",
      entityType: "DEBTOR",
      entityId: debtorId,
      newValue: {
        debtor_id: debtorId,
        first_name: debtor.firstName,
        last_name: debtor.lastName,
        phone_number: debtor.phoneNumber,
        address: debtor.address,
      },
      description: `Qarzdor ${debtor.firstName} ${debtor.lastName} o'chirildi`,
      ipAddress: request.headers.get("cf-connecting-ip") || "",
      userAgent: request.headers.get("user-agent") || "",
    });

    await debtorService.delete(clientId, debtorId);

    revalidatePath("/dashboard/debtors");
    revalidatePath("/dashboard/default");
    revalidatePath(`/dashboard/default/debitor/${debtor.externalId}`);

    return NextResponse.json({ message: "Qarzdor o'chirildi" });
  } catch (error) {
    console.error("Error deleting debtor:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
