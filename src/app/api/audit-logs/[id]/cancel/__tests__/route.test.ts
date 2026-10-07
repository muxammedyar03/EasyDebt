import { POST } from "../route";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/security/permission-access";
import { cancelAuditAction } from "@/lib/audit-cancel";

jest.mock("@/lib/auth", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/security/permission-access", () => ({ hasPermission: jest.fn() }));
jest.mock("@/lib/audit-cancel", () => ({ cancelAuditAction: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const context = { params: Promise.resolve({ id: "41" }) };
function request(reason = "Xato kiritilgan") {
  return new Request("http://localhost/api/audit-logs/41/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
}
describe("financial cancel endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getSession).mockResolvedValue({ userId: 99, clientId: 4, role: "ADMIN" } as never);
    jest.mocked(hasPermission).mockResolvedValue(true);
  });

  it("requires a session, an explicit permission and a reason", async () => {
    jest.mocked(getSession).mockResolvedValueOnce(null);
    expect((await POST(request(), context)).status).toBe(401);
    jest.mocked(hasPermission).mockResolvedValueOnce(false);
    expect((await POST(request(), context)).status).toBe(403);
    expect((await POST(request(""), context)).status).toBe(400);
    expect(cancelAuditAction).not.toHaveBeenCalled();
  });

  it("uses the session tenant and audit ID", async () => {
    jest.mocked(cancelAuditAction).mockResolvedValue({ audit: { id: 50 }, debtorExternalId: "uuid" } as never);
    expect((await POST(request(), context)).status).toBe(200);
    expect(cancelAuditAction).toHaveBeenCalledWith(4, 99, 41, "Xato kiritilgan");
  });
});
