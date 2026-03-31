import { prisma } from "@/lib/prisma";

const WINDOW_MS = 60_000;
const IP_LIMIT = 20;
const PHONE_LIMIT = 5;
const PRICE_ASSISTANT_LIMIT = 12;

function windowEnd(now: Date): Date {
  return new Date(now.getTime() + WINDOW_MS);
}

export async function rateLimitOk(
  kind: "ip" | "phone",
  key: string,
): Promise<boolean> {
  const id = `rl:${kind}:${key}`;
  const now = new Date();

  const row = await prisma.rateLimitBucket.findUnique({ where: { id } });

  if (!row || row.windowEnd < now) {
    await prisma.rateLimitBucket.upsert({
      where: { id },
      create: { id, count: 1, windowEnd: windowEnd(now) },
      update: { count: 1, windowEnd: windowEnd(now) },
    });
    return true;
  }

  const limit = kind === "ip" ? IP_LIMIT : PHONE_LIMIT;
  if (row.count >= limit) return false;

  await prisma.rateLimitBucket.update({
    where: { id },
    data: { count: { increment: 1 } },
  });
  return true;
}

/** Лимит запросов к ИИ-подбору услуг (на пользователя ЛК). */
export async function priceAssistantRateLimitOk(userId: string): Promise<boolean> {
  const id = `rl:priceassistant:${userId}`;
  const now = new Date();

  const row = await prisma.rateLimitBucket.findUnique({ where: { id } });

  if (!row || row.windowEnd < now) {
    await prisma.rateLimitBucket.upsert({
      where: { id },
      create: { id, count: 1, windowEnd: windowEnd(now) },
      update: { count: 1, windowEnd: windowEnd(now) },
    });
    return true;
  }

  if (row.count >= PRICE_ASSISTANT_LIMIT) return false;

  await prisma.rateLimitBucket.update({
    where: { id },
    data: { count: { increment: 1 } },
  });
  return true;
}
