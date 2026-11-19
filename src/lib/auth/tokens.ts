import "server-only";

import { createHash, randomBytes } from "node:crypto";

/** A random link token. Only its SHA-256 is stored, so a database leak does not hand out working links. */
export function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
