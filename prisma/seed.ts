import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { seedCatalogs, seedPositions } from "./seed-catalogs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// The system admin comes from the environment, never from source code.
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("ADMIN_EMAIL / ADMIN_PASSWORD not set: skipping admin seed.");
    return;
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must have at least 8 characters.");
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "SYSTEM_ADMIN", organizationId: null },
    create: {
      email,
      name: process.env.ADMIN_NAME?.trim() || "Administrador",
      passwordHash,
      role: "SYSTEM_ADMIN",
    },
  });
  console.log(`System admin ready: ${email}`);
}

async function main() {
  await seedCatalogs(prisma);
  await seedPositions(prisma);
  console.log("Catalogs ready (sports, event types, competition formats).");
  await seedAdmin();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
