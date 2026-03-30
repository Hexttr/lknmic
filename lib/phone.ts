/**
 * Нормализация российского мобильного номера в E.164 (+79XXXXXXXXX).
 */
export function normalizePhoneRu(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let rest = digits;

  if (rest.length === 11 && rest.startsWith("8")) {
    rest = "7" + rest.slice(1);
  }
  if (rest.length === 11 && rest.startsWith("7")) {
    rest = rest.slice(1);
  }

  if (rest.length !== 10) return null;
  if (rest[0] !== "9") return null;

  return `+7${rest}`;
}

export function toSmsRuDigits(phoneE164: string): string {
  return phoneE164.replace("+", "");
}
