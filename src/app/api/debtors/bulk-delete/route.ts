import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getApiErrorMessage } from "@/lib/errors";
import { debtorRepository } from "@/entities/debtor/api";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clientId = requireClientId(session);

    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
    }

    await debtorRepository.deleteMany({ id: { in: ids }, client_id: clientId });

    // Revalidate pages that display debtor data
    revalidatePath("/dashboard/debtors");
    revalidatePath("/dashboard/default");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting debtors:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
