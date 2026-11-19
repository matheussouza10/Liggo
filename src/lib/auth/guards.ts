import "server-only";

import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";

/** Organizer area: any signed-in user that is not the system admin. */
export async function requireOrganizationUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "SYSTEM_ADMIN") redirect("/admin");
  return user;
}

/** Admin area: system admin only. */
export async function requireSystemAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== "SYSTEM_ADMIN") redirect("/admin/login");
  return user;
}

/** Owner-only areas (team, invitations, organization data). Members are sent back to the settings home. */
export async function requireOwner(): Promise<SessionUser> {
  const user = await requireOrganizationUser();
  if (user.role !== "OWNER" || !user.organization) redirect("/settings");
  return user;
}
