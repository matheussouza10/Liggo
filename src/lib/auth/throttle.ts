import "server-only";

import { prisma } from "@/lib/prisma";

export type AttemptKind = "LOGIN_FAIL" | "RESET_REQUEST" | "INVITE";

const key = (value: string) => value.trim().toLowerCase();

/** How many attempts of this kind this key made inside the window. */
export function countAttempts(
  kind: AttemptKind,
  value: string,
  windowMs: number,
): Promise<number> {
  return prisma.authAttempt.count({
    where: {
      kind,
      key: key(value),
      createdAt: { gte: new Date(Date.now() - windowMs) },
    },
  });
}

/** True when the key already used up its attempts inside the window. */
export async function isBlocked(
  kind: AttemptKind,
  value: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  return (await countAttempts(kind, value, windowMs)) >= max;
}

export async function recordAttempt(
  kind: AttemptKind,
  value: string,
): Promise<void> {
  await prisma.authAttempt.create({ data: { kind, key: key(value) } });
  // Old rows are useless; clean a little on the way.
  if (Math.random() < 0.05)
    await prisma.authAttempt.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
}

export async function clearAttempts(
  kind: AttemptKind,
  value: string,
): Promise<void> {
  await prisma.authAttempt.deleteMany({ where: { kind, key: key(value) } });
}

export const LIMITS = {
  login: { max: 5, windowMs: 15 * 60 * 1000 },
  resetPerMinute: { max: 1, windowMs: 60 * 1000 },
  resetPerHour: { max: 3, windowMs: 60 * 60 * 1000 },
  invitePerHour: { max: 20, windowMs: 60 * 60 * 1000 },
} as const;
