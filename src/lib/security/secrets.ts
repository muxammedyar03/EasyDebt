/** Edge-safe, lazy configuration validation (builds do not need runtime secrets). */
export function getJwtKey(): Uint8Array {
  const value = process.env.JWT_SECRET?.trim();
  if (!value || value.length < 32 || value === "your-secret-key-change-this-in-production") {
    throw new Error("JWT_SECRET must be a private random value of at least 32 characters");
  }
  return new TextEncoder().encode(value);
}

/** Domain separation without requiring an extra production env variable.
 * An optional independently rotated SHARE_SECRET takes precedence.
 */
export async function getShareKey(): Promise<Uint8Array> {
  const explicit = process.env.SHARE_SECRET?.trim();
  if (explicit) {
    if (explicit.length < 32 || explicit === process.env.JWT_SECRET?.trim()) {
      throw new Error("SHARE_SECRET must be at least 32 characters and different from JWT_SECRET");
    }
    return new TextEncoder().encode(explicit);
  }
  const key = await crypto.subtle.importKey(
    "raw",
    getJwtKey() as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("EasyDebt/share/v1")));
}
