import { SignJWT, jwtVerify } from "jose";

const SHARE_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-this-in-production");

export async function signShareToken(externalId: string, clientId: number, issuerUserId: number): Promise<string> {
  return await new SignJWT({ externalId, clientId, issuerUserId, purpose: "debtor-share" })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("debtor-share")
    .setIssuedAt()
    .setExpirationTime("2d") // Token expires in 2 days (48 hours)
    .sign(SHARE_SECRET);
}

export async function verifyShareToken(
  token: string,
  expectedExternalId: string,
): Promise<{ clientId: number; issuerUserId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, SHARE_SECRET, { algorithms: ["HS256"], audience: "debtor-share" });
    if (
      payload.externalId !== expectedExternalId ||
      payload.purpose !== "debtor-share" ||
      !Number.isSafeInteger(payload.clientId) ||
      Number(payload.clientId) <= 0 ||
      !Number.isSafeInteger(payload.issuerUserId) ||
      Number(payload.issuerUserId) <= 0
    )
      return null;
    return { clientId: payload.clientId as number, issuerUserId: payload.issuerUserId as number };
  } catch (error) {
    console.error("Share token verification failed:", error);
    return null;
  }
}
