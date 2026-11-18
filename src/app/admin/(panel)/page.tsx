import type { Metadata } from "next";
import { requireSystemAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Administração | Liggo",
  robots: { index: false, follow: false },
};

// Reads the session on every request, so it cannot be part of the static shell
// (see the note in the parent layout). Streaming still applies.
export const instant = false;

export default async function AdminPage() {
  const user = await requireSystemAdmin();

  return (
    <div>
      <h1 className="font-display text-4xl leading-none font-extrabold uppercase sm:text-5xl">
        Administração
      </h1>
      <p className="mt-3 text-muted-foreground">
        Olá, {user.name.split(" ")[0]}. Aqui ficará a gestão das organizações e
        dos usuários do Liggo.
      </p>
    </div>
  );
}
