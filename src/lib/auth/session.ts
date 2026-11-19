import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "liggo_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  /** The id of the session cookie in use, to keep it when signing out of the others. */
  sessionId: string;
  id: string;
  name: string;
  email: string;
  role: "SYSTEM_ADMIN" | "OWNER" | "MEMBER";
  organization: { id: string; name: string; slug: string } | null;
};

// Only the SHA-256 of the token is stored, so a database leak does not
// hand out working sessions.
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Reads the session cookie and returns the signed-in user, or null. */
// Memoized per request: a layout and its page can both ask without two queries.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Whether a session is still valid depends on the current time, so this is
  // request-time work and must never be prerendered.
  await connection();
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          disabledAt: true,
          organization: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  // A deactivated person has no sessions; this also covers one deactivated mid-request.
  const { disabledAt, ...user } = session.user;
  if (disabledAt) return null;
  return { ...user, sessionId: session.id };
});

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(COOKIE_NAME);
}
