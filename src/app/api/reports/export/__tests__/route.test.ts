import { NextRequest } from "next/server";
import { GET } from "../route";
import { getSession } from "@/lib/auth";
import { reportsService } from "@/lib/services/reports.service";
jest.mock("@/lib/auth", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/services/reports.service", () => ({ reportsService: { exportReport: jest.fn() } }));
const session = getSession as jest.Mock;
const exportReport = reportsService.exportReport as jest.Mock;
const request = (query = "") => new NextRequest(`http://localhost/api/reports/export?${query}`);
beforeEach(() => {
  jest.clearAllMocks();
  session.mockResolvedValue({ clientId: 7 });
});
it("requires authentication and tenant context", async () => {
  session.mockResolvedValueOnce(null);
  expect((await GET(request())).status).toBe(401);
  session.mockResolvedValueOnce({});
  expect((await GET(request())).status).toBe(403);
  expect(exportReport).not.toHaveBeenCalled();
});
it("rejects invalid periods before starting a download", async () => {
  expect((await GET(request("date=2026-02-30"))).status).toBe(400);
  expect(exportReport).not.toHaveBeenCalled();
});
it("exports from the session tenant, ignores a supplied clientId and forbids caching", async () => {
  exportReport.mockImplementation(async (_id, _query, consume) =>
    consume([
      {
        kind: "payment",
        id: 1,
        debtor_external_id: "7-debtor",
        debtor_name: "=CMD()",
        amount: "10.20",
        payment_type: "CASH",
        created_at: "2026-01-10T00:00:00Z",
        note: null,
      },
    ]),
  );
  const response = await GET(request("date=2026-01-10&clientId=999"));
  const csv = await response.text();
  expect(exportReport.mock.calls[0][0]).toBe(7);
  expect(csv).toContain('"\'=CMD()"');
  expect(csv).toContain('"10.20"');
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
it("fails the stream rather than delivering a successful partial export", async () => {
  exportReport.mockRejectedValue(new Error("database secret"));
  const response = await GET(request());
  await expect(response.text()).rejects.toThrow("Report export failed");
});
