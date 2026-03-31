import { APP_SETTING_PRICE_ASSISTANT_VISIBLE } from "@/lib/app-settings-keys";
import { prisma } from "@/lib/prisma";

/** Показывать блок «Подбор услуги» в ЛК. По умолчанию true, если в БД нет записи. */
export async function getShowPriceAssistantChat(): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({
    where: { key: APP_SETTING_PRICE_ASSISTANT_VISIBLE },
    select: { value: true },
  });
  if (!row?.value?.trim()) return true;
  return row.value.trim().toLowerCase() !== "false";
}
