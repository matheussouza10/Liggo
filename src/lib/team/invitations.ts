import "server-only";

import { hashToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/prisma";

export const INVITE_DAYS = 7;

/** The invitation behind a link token, or null when it is not usable (unknown, used, cancelled or expired). */
export async function findUsableInvitation(token: string) {
  if (!token) return null;
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      email: true,
      role: true,
      acceptedAt: true,
      revokedAt: true,
      expiresAt: true,
      organization: { select: { id: true, name: true } },
    },
  });
  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.revokedAt ||
    invitation.expiresAt.getTime() <= Date.now()
  )
    return null;
  return invitation;
}

/** The current time, read on the server per request (kept out of components, which must be pure). */
export const serverNow = () => Date.now();
