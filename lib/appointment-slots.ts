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

export function isValidHourlySlot(slot: string): boolean {
  return SLOT_SET.has(slot);
}
