import { can } from "@/lib/security/permissions";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getApiErrorMessage } from "@/lib/errors";
import { deleteEmptyRecords, RecordDeletionError } from "@/lib/security/delete-records";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!can(session, "records.delete")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const clientId = requireClientId(session);

    const { ids } = await request.json();

    if (
      !ids ||
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.length > 1000 ||
      ids.some((id: unknown) => !Number.isSafeInteger(id) || Number(id) <= 0) ||
      new Set(ids).size !== ids.length
    ) {
      return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
    }

    await deleteEmptyRecords("debtor", clientId, ids, session.userId);

    // Revalidate pages that display debtor data
    revalidatePath("/dashboard/debtors");
    revalidatePath("/dashboard/default");

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof RecordDeletionError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Error deleting debtors:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
