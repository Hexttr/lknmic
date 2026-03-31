/** Часовые интервалы 08:00–09:00 … 17:00–18:00 */
export const APPOINTMENT_HOURLY_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 8; h < 18; h++) {
    const start = `${String(h).padStart(2, "0")}:00`;
    const end = `${String(h + 1).padStart(2, "0")}:00`;
    out.push(`${start}-${end}`);
  }
  return out;
})();

const SLOT_SET = new Set(APPOINTMENT_HOURLY_SLOTS);

function slotStartMinutes(slot: string): number {
  const start = slot.split("-")[0] ?? "";
  const [h, m] = start.split(":").map((x) => Number.parseInt(x, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

/**
 * Для выбранной календарной даты (YYYY-MM-DD, локальная дата пользователя на клиенте
 * и сервере в соответствующем контексте) возвращает слоты, начало которых ещё не наступило
 * по сравнению с `now`. Для будущих дат — все слоты из списка.
 */
export function filterSlotsForAppointmentDate(
  isoDate: string,
  slots: readonly string[],
  now: Date = new Date(),
): string[] {
  const parts = isoDate.split("-").map((x) => Number.parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return [];
  }
  const [y, mo, day] = parts;
  const selected = new Date(y, mo - 1, day);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (selected < todayStart) {
    return [];
  }
  if (selected > todayStart) {
    return [...slots];
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slots.filter((slot) => {
    const sm = slotStartMinutes(slot);
    if (!Number.isFinite(sm)) return false;
    return sm > nowMinutes;
  });
}

export function isValidHourlySlot(slot: string): boolean {
  return SLOT_SET.has(slot);
}
