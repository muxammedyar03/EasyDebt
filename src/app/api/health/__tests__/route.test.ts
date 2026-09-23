import { GET } from "../route";
import { prisma } from "@/lib/prisma";
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
it("reports readiness without caching or exposing connection data", async () => {
  (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({ status: "ok" });
});
it("returns 503 on database failure without leaking the error", async () => {
  (prisma.$transaction as jest.Mock).mockRejectedValue(new Error("postgres://private-password"));
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: "unavailable" });
});
