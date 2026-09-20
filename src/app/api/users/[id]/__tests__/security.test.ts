import { NextRequest } from "next/server";
import { PATCH } from "../route";
import { getSession } from "@/lib/auth";
import { takePinAttempt } from "@/lib/security/rate-limit";
import { prisma } from "@/lib/prisma";
jest.mock("@/lib/auth", () => ({ getSession: jest.fn(), setAuthCookie: jest.fn(), signToken: jest.fn() }));
jest.mock("@/lib/security/rate-limit", () => ({ takePinAttempt: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prisma: { user: { findFirst: jest.fn() } } }));
const request = () =>
  new NextRequest("http://localhost/api/users/1", {
    method: "PATCH",
    body: JSON.stringify({ action: "verify_pin", pin: "1234" }),
  });
beforeEach(() => jest.clearAllMocks());
it("requires a session before looking up a PIN", async () => {
  jest.mocked(getSession).mockResolvedValue(null);
  expect((await PATCH(request(), { params: Promise.resolve({ id: "1" }) })).status).toBe(401);
  expect(prisma.user.findFirst).not.toHaveBeenCalled();
});
it("denies another user's PIN even to an authenticated user", async () => {
  jest.mocked(getSession).mockResolvedValue({ userId: 2, username: "b", role: "USER", clientId: 2 });
  expect((await PATCH(request(), { params: Promise.resolve({ id: "1" }) })).status).toBe(403);
  expect(prisma.user.findFirst).not.toHaveBeenCalled();
});
it("throttles PIN attempts before bcrypt verification", async () => {
  jest.mocked(getSession).mockResolvedValue({ userId: 1, username: "a", role: "USER", clientId: 1 });
  jest.mocked(takePinAttempt).mockResolvedValue(false);
  expect((await PATCH(request(), { params: Promise.resolve({ id: "1" }) })).status).toBe(429);
  expect(prisma.user.findFirst).not.toHaveBeenCalled();
});
