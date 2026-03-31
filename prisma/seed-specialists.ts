/**
 * Только справочник специалистов (без пользователей-админов).
 * На проде: добавляет новые типы и синхронизирует iconKey/sortOrder по имени.
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { syncSpecialistTypesFromSeed } from "./sync-specialists";

async function main() {
  await syncSpecialistTypesFromSeed(prisma);
  console.log("Specialist types: done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
