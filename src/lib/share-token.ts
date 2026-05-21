import { SignJWT, jwtVerify } from "jose";

const SHARE_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-this-in-production");

export async function signShareToken(externalId: string): Promise<string> {
  return await new SignJWT({ externalId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2d") // Token expires in 2 days (48 hours)
    .sign(SHARE_SECRET);
}

export async function verifyShareToken(token: string, expectedExternalId: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, SHARE_SECRET);
    return payload.externalId === expectedExternalId;
  } catch (error) {
    console.error("Share token verification failed:", error);
    return false;
  }
}
