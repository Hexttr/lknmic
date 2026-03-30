import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";

const ADMIN_PHONE = "+79806744999";

async function main() {
  await prisma.user.upsert({
    where: { phone: ADMIN_PHONE },
    create: {
      phone: ADMIN_PHONE,
      role: Role.ADMIN,
      fullName: "Администратор",
    },
    update: {
      role: Role.ADMIN,
    },
  });
  console.log(`Admin role set for ${ADMIN_PHONE}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
