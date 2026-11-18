import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { ShellFallback } from "@/components/app/shell-fallback";
import { requireSystemAdmin } from "@/lib/auth/guards";

// These routes read the session (cookie + database) on every request, so they
// cannot be part of the static shell. Opting out of instant-navigation
// validation keeps the read on the server instead of caching the user in the
// browser, which would delay revoking a session.
export const instant = false;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

async function AdminShell({ children }: { children: ReactNode }) {
  const user = await requireSystemAdmin();
  return (
    <AppShell
      area="admin"
      user={{ name: user.name, detail: "Administrador do sistema" }}
    >
      {children}
    </AppShell>
  );
}
