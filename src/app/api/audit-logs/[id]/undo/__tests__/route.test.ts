import { POST } from "../route";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/security/permission-access";
import { undoAuditAction } from "@/lib/audit-undo";

jest.mock("@/lib/auth", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/security/permission-access", () => ({ hasPermission: jest.fn() }));
jest.mock("@/lib/audit-undo", () => ({ undoAuditAction: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const request = new Request("http://localhost/api/audit-logs/51/undo", { method: "POST" });
const context = { params: Promise.resolve({ id: "51" }) };

describe("audit undo endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getSession).mockResolvedValue({ userId: 11, clientId: 4, role: "ADMIN" } as never);
    jest.mocked(hasPermission).mockResolvedValue(true);
  });

  it("rejects unauthenticated and unpermitted requests before touching data", async () => {
    jest.mocked(getSession).mockResolvedValueOnce(null);
    expect((await POST(request, context)).status).toBe(401);
    jest.mocked(hasPermission).mockResolvedValueOnce(false);
    expect((await POST(request, context)).status).toBe(403);
    expect(undoAuditAction).not.toHaveBeenCalled();
  });

  it("uses the session tenant and actor instead of caller supplied values", async () => {
    jest.mocked(undoAuditAction).mockResolvedValue({ id: 52 } as never);
    expect((await POST(request, context)).status).toBe(200);
    expect(undoAuditAction).toHaveBeenCalledWith(4, 11, 51, "ADMIN");
  });
});
