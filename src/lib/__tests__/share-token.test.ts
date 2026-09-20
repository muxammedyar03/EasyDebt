import { getShareKey } from "../security/secrets";
import { SignJWT } from "jose";
import { signShareToken, verifyShareToken } from "../share-token";
it("validates a tenant-scoped share token", async () => {
  const token = await signShareToken("debtor", 1, 7);
  await expect(verifyShareToken(token, "debtor")).resolves.toEqual({ clientId: 1, issuerUserId: 7 });
  await expect(verifyShareToken(token, "another")).resolves.toBeNull();
});
it("rejects unscoped legacy links", async () => {
  const token = await new SignJWT({ externalId: "debtor" })
    .setProtectedHeader({ alg: "HS256" })
    .sign(await getShareKey());
  await expect(verifyShareToken(token, "debtor")).resolves.toBeNull();
});
it("rejects expired scoped links", async () => {
  const token = await new SignJWT({ externalId: "debtor", clientId: 1, issuerUserId: 7, purpose: "debtor-share" })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("debtor-share")
    .setExpirationTime(1)
    .sign(await getShareKey());
  await expect(verifyShareToken(token, "debtor")).resolves.toBeNull();
});
