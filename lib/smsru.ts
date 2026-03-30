const SMSRU_BASE = "https://sms.ru";

export type CallcheckAddResult =
  | {
      ok: true;
      checkId: string;
      callPhone: string;
      callPhonePretty: string;
    }
  | { ok: false; error: string; statusCode?: number };

export type CallcheckStatusResult =
  | { ok: true; confirmed: boolean; expired: boolean; rawStatus: string }
  | { ok: false; error: string };

function apiId(): string {
  const id = process.env.SMS_RU_API_ID;
  if (!id) throw new Error("SMS_RU_API_ID is not configured");
  return id;
}

/**
 * Создать проверку callcheck: пользователь должен позвонить на callPhone.
 */
export async function callcheckAdd(phoneDigits: string): Promise<CallcheckAddResult> {
  const url = new URL(`${SMSRU_BASE}/callcheck/add`);
  url.searchParams.set("api_id", apiId());
  url.searchParams.set("phone", phoneDigits);
  url.searchParams.set("json", "1");

  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "Некорректный ответ SMS.ru" };
  }

  if (data.status !== "OK") {
    return {
      ok: false,
      error: String(data.status_text ?? "Ошибка SMS.ru"),
      statusCode: Number(data.status_code),
    };
  }

  const checkId = String(data.check_id ?? "");
  const callPhone = String(data.call_phone ?? "");
  const callPhonePretty = String(
    data.call_phone_pretty ?? data.call_phone ?? "",
  );

  if (!checkId || !callPhone) {
    return { ok: false, error: "Нет check_id или call_phone в ответе" };
  }

  return { ok: true, checkId, callPhone, callPhonePretty };
}

/**
 * Опрос статуса проверки. check_status 401 — номер подтверждён.
 */
export async function callcheckStatus(
  checkId: string,
): Promise<CallcheckStatusResult> {
  const url = new URL(`${SMSRU_BASE}/callcheck/status`);
  url.searchParams.set("api_id", apiId());
  url.searchParams.set("check_id", checkId);
  url.searchParams.set("json", "1");

  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "Некорректный ответ SMS.ru" };
  }

  if (data.status !== "OK") {
    return {
      ok: false,
      error: String(data.status_text ?? "Ошибка SMS.ru"),
    };
  }

  const rawStatus = String(data.check_status ?? "");
  const confirmed = rawStatus === "401";
  const expired = rawStatus === "402";

  return { ok: true, confirmed, expired, rawStatus };
}
