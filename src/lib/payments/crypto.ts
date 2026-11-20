import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

/**
 * API keys of Asaas are stored encrypted (AES-256-GCM). The key comes from
 * PAYMENT_ENCRYPTION_KEY (32 bytes in base64). Development falls back to a
 * fixed key so the screens work; production refuses to run without one.
 */
function key(): Buffer {
  const raw = process.env.PAYMENT_ENCRYPTION_KEY?.trim();
  if (raw) {
    const buf = Buffer.from(raw, "base64");
    if (buf.length !== 32)
      throw new Error(
        "PAYMENT_ENCRYPTION_KEY precisa ter 32 bytes em base64 (openssl rand -base64 32).",
      );
    return buf;
  }
  if (process.env.NODE_ENV === "production")
    throw new Error(
      "Defina PAYMENT_ENCRYPTION_KEY para guardar chaves de pagamento.",
    );
  return createHash("sha256").update("liggo-development-payment-key").digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1:${Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64")}`;
}

export function decryptSecret(stored: string): string {
  if (!stored.startsWith("v1:"))
    throw new Error("Segredo em formato desconhecido.");
  const buf = Buffer.from(stored.slice(3), "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

/** Last characters only, to show that a key exists without exposing it. */
export const maskSecret = (plain: string) =>
  plain.length <= 8 ? "••••" : `••••${plain.slice(-4)}`;
