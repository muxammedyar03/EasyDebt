import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireClientId, TenantError } from "@/lib/tenant";
import { parseReportQuery } from "@/lib/report-query";
import { REPORT_CSV_HEADER, reportCsvRows } from "@/lib/report-csv";
import { reportsService } from "@/lib/services/reports.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let clientId;
  try {
    clientId = requireClientId(session);
  } catch (error) {
    return NextResponse.json(
      { error: "Client context required" },
      { status: error instanceof TenantError ? error.status : 403 },
    );
  }
  let query;
  try {
    query = parseReportQuery(Object.fromEntries(request.nextUrl.searchParams));
  } catch {
    return NextResponse.json({ error: "Invalid report period" }, { status: 400 });
  }
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  const abort = () => {
    void writer.abort(new Error("Export cancelled")).catch(() => undefined);
  };
  const timeout = setTimeout(abort, 60_000);
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) abort();
  void (async () => {
    try {
      await writer.write(encoder.encode(REPORT_CSV_HEADER));
      await reportsService.exportReport(clientId, query, async (rows) => {
        await writer.write(encoder.encode(reportCsvRows(rows)));
      });
      await writer.close();
    } catch {
      // Fail the download, never present a truncated financial export as complete.
      await writer.abort(new Error("Report export failed")).catch(() => undefined);
    } finally {
      clearTimeout(timeout);
      request.signal.removeEventListener("abort", abort);
    }
  })();
  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cash-report-${query.date}-${query.range}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
