import "server-only";

import { prisma } from "@/lib/prisma";
import { hashToken } from "./tokens";

/** Whether a reset link can still be used (found, not used, not expired, person not deactivated). */
export async function isResetTokenUsable(token: string): Promise<boolean> {
  if (!token) return false;
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      usedAt: true,
      expiresAt: true,
      user: { select: { disabledAt: true } },
    },
  });
  return (
    !!row &&
    !row.usedAt &&
    row.expiresAt.getTime() > Date.now() &&
    !row.user.disabledAt
  );
}
