import "dotenv/config";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";

const ADMIN_PHONE = "+79806744999";

/** Начальный справочник специалистов (иконки — ключи из lib/specialist-icons.tsx) */
const SEED_SPECIALISTS: { name: string; iconKey: string }[] = [
  { name: "Аллерголог", iconKey: "wind" },
  { name: "Гастроэнтеролог", iconKey: "apple" },
  { name: "Гинеколог", iconKey: "venus" },
  { name: "Диетолог", iconKey: "salad" },
  { name: "Оториноларинголог", iconKey: "ear" },
  { name: "Кардиолог", iconKey: "heart_pulse" },
  { name: "Косметолог", iconKey: "sparkles" },
  { name: "Дерматолог", iconKey: "droplet" },
  { name: "ЛФК", iconKey: "dumbbell" },
  { name: "Невролог", iconKey: "brain" },
  { name: "Неонатолог", iconKey: "baby" },
  { name: "Нефролог", iconKey: "droplets" },
  { name: "Ортодонт", iconKey: "smile" },
  { name: "Ортопед", iconKey: "bone" },
  { name: "Офтальмолог", iconKey: "eye" },
  { name: "Педиатр", iconKey: "users" },
  { name: "Психиатр", iconKey: "brain_circuit" },
  { name: "Психолог", iconKey: "message_circle" },
  { name: "Пульмонолог", iconKey: "pill" },
  { name: "Ревматолог", iconKey: "activity" },
  { name: "Стоматолог", iconKey: "smile_plus" },
  { name: "Сурдолог", iconKey: "mic" },
  { name: "Уролог", iconKey: "droplet" },
  { name: "Физиотерапевт", iconKey: "zap" },
  { name: "Фтизиатр", iconKey: "stethoscope" },
  { name: "Функциональная диагностика", iconKey: "line_chart" },
  { name: "МРТ", iconKey: "scan" },
  { name: "КТ", iconKey: "box" },
  { name: "УЗИ", iconKey: "radio" },
  { name: "Хирург", iconKey: "scissors" },
  { name: "Эндокринолог", iconKey: "flask_conical" },
];

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

  for (let i = 0; i < SEED_SPECIALISTS.length; i++) {
    const row = SEED_SPECIALISTS[i];
    const existing = await prisma.specialistType.findFirst({
      where: { name: row.name },
    });
    if (!existing) {
      await prisma.specialistType.create({
        data: { ...row, sortOrder: i },
      });
    }
  }
  console.log(`Specialist types seeded (skipped existing names)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
