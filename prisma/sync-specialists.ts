import type { PrismaClient } from "@prisma/client";
import { SEED_SPECIALISTS } from "./specialist-seed-data";

/** Добавляет отсутствующие типы; для совпадающих имён обновляет iconKey и sortOrder. */
export async function syncSpecialistTypesFromSeed(prisma: PrismaClient) {
  for (let i = 0; i < SEED_SPECIALISTS.length; i++) {
    const row = SEED_SPECIALISTS[i];
    const existing = await prisma.specialistType.findFirst({
      where: { name: row.name },
    });
    if (!existing) {
      await prisma.specialistType.create({
        data: { ...row, sortOrder: i },
      });
      console.log(`+ ${row.name}`);
    } else {
      await prisma.specialistType.update({
        where: { id: existing.id },
        data: { iconKey: row.iconKey, sortOrder: i },
      });
      console.log(`↻ ${row.name}`);
    }
  }
}
