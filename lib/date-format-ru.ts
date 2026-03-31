/** YYYY-MM-DD → ДД.ММ.ГГГГ */
export function formatDateRuFromIso(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}
