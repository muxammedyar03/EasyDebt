import { SignJWT, jwtVerify } from "jose";

import { getShareKey } from "@/lib/security/secrets";

export async function signShareToken(externalId: string, clientId: number, issuerUserId: number): Promise<string> {
  return await new SignJWT({ externalId, clientId, issuerUserId, purpose: "debtor-share" })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("debtor-share")
    .setIssuedAt()
    .setExpirationTime("2d") // Token expires in 2 days (48 hours)
    .sign(await getShareKey());
}

export async function verifyShareToken(
  token: string,
  expectedExternalId: string,
): Promise<{ clientId: number; issuerUserId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, await getShareKey(), {
      algorithms: ["HS256"],
      audience: "debtor-share",
    });
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
  } catch {
    return null;
  }
}
