import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { gzipSync, gunzipSync } from "zlib";
import { z } from "zod";

export const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
export class BackupError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function key() {
  const secret = process.env.TENANT_BACKUP_SECRET?.trim();
  if (!secret || secret.length < 32)
    throw new BackupError("TENANT_BACKUP_SECRET must be configured (at least 32 random characters)", 503);
  return createHash("sha256").update("EasyDebt/tenant-backup/v1:").update(secret).digest();
}
const envelope = z
  .object({ format: z.literal("easydebt-encrypted-tenant-v1"), iv: z.string(), tag: z.string(), data: z.string() })
  .strict();
export function sealBackup(snapshot: unknown): string {
  const raw = Buffer.from(JSON.stringify(snapshot));
  if (raw.length > MAX_BACKUP_BYTES)
    throw new BackupError("Backup exceeds 100 MiB; no partial backup was produced", 413);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from("easydebt-encrypted-tenant-v1"));
  const data = Buffer.concat([cipher.update(gzipSync(raw)), cipher.final()]);
  return JSON.stringify({
    format: "easydebt-encrypted-tenant-v1",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  });
}
export function openBackup(text: string): unknown {
  if (Buffer.byteLength(text) > MAX_BACKUP_BYTES * 1.5) throw new BackupError("Archive is too large", 413);
  const secret = key();
  try {
    const file = envelope.parse(JSON.parse(text));
    const decipher = createDecipheriv("aes-256-gcm", secret, Buffer.from(file.iv, "base64"));
    decipher.setAAD(Buffer.from(file.format));
    decipher.setAuthTag(Buffer.from(file.tag, "base64"));
    const compressed = Buffer.concat([decipher.update(Buffer.from(file.data, "base64")), decipher.final()]);
    return JSON.parse(gunzipSync(compressed, { maxOutputLength: MAX_BACKUP_BYTES }).toString("utf8"));
  } catch {
    throw new BackupError("Backup is invalid, changed, or encrypted with a different backup key");
  }
}

export function assertBackupConfigured() {
  key();
}
