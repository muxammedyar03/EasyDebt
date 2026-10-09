import { NextResponse } from "next/server";

import type { RecentAuditActionsResponse } from "@/entities/audit-log/model";
import { getSession } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/errors";
import { hasPermission } from "@/lib/security/permission-access";
import { auditLogService } from "@/lib/services/audit-log.service";
import { requireClientId } from "@/lib/tenant";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await hasPermission(session, "audit.view"))) {
      return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    }

    const clientId = requireClientId(session);
    const [canUndo, canCancel] = await Promise.all([
      hasPermission(session, "audit.undo"),
      hasPermission(session, "audit.cancel"),
    ]);
    const actions = await auditLogService.getRecentActions({
      clientId,
      actorRole: session.role,
      canUndo,
      canCancel,
    });
    const response: RecentAuditActionsResponse = { actions };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching recent audit actions:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
