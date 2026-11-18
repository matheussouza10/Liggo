import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { ShellFallback } from "@/components/app/shell-fallback";
import { requireOrganizationUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

// These routes read the session (cookie + database) on every request, so they
// cannot be part of the static shell. Opting out of instant-navigation
// validation keeps the read on the server instead of caching the user in the
// browser, which would delay revoking a session.
export const instant = false;

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <OrganizationShell>{children}</OrganizationShell>
    </Suspense>
  );
}

async function OrganizationShell({ children }: { children: ReactNode }) {
  const user = await requireOrganizationUser();
  const eventCount = user.organization
    ? await prisma.event.count({
        where: { organizationId: user.organization.id },
      })
    : 0;
  return (
    <AppShell
      area="organizer"
      eventCount={eventCount}
      user={{
        name: user.name,
        detail: user.organization?.name ?? "Sem organização",
      }}
    >
      {children}
    </AppShell>
  );
}
