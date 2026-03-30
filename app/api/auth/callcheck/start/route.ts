import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashIp } from "@/lib/ip-hash";
import { normalizePhoneRu, toSmsRuDigits } from "@/lib/phone";
import { rateLimitOk } from "@/lib/rate-limit";
import { callcheckAdd } from "@/lib/smsru";

const PENDING_TTL_MS = 5 * 60 * 1000;

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function hashSecret(): string {
  return (
    process.env.IP_HASH_SECRET ?? process.env.SESSION_SECRET ?? "fallback-secret"
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const phoneRaw =
    typeof body === "object" && body !== null && "phone" in body
      ? String((body as { phone: unknown }).phone)
      : "";

  const normalized = normalizePhoneRu(phoneRaw);
  if (!normalized) {
    return NextResponse.json(
      { error: "Введите корректный мобильный номер в формате +7" },
      { status: 400 },
    );
  }

  const ip = clientIp(request);
  const ipHash = hashIp(ip, hashSecret()) ?? `ip:${ip}`;

  if (!(await rateLimitOk("ip", ipHash))) {
    return NextResponse.json(
      { error: "Слишком много запросов. Попробуйте позже." },
      { status: 429 },
    );
  }

  if (!(await rateLimitOk("phone", normalized))) {
    return NextResponse.json(
      { error: "Слишком много попыток для этого номера." },
      { status: 429 },
    );
  }

  let smsResult: Awaited<ReturnType<typeof callcheckAdd>>;
  try {
    smsResult = await callcheckAdd(toSmsRuDigits(normalized));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("SMS_RU_API_ID")) {
      return NextResponse.json(
        { error: "Сервис подтверждения номера не настроен" },
        { status: 503 },
      );
    }
    throw e;
  }

  if (!smsResult.ok) {
    return NextResponse.json(
      { error: smsResult.error || "Ошибка SMS.ru" },
      { status: 400 },
    );
  }

  const expiresAt = new Date(Date.now() + PENDING_TTL_MS);

  const pending = await prisma.pendingAuth.create({
    data: {
      checkId: smsResult.checkId,
      phone: normalized,
      ipHash,
      expiresAt,
    },
  });

  return NextResponse.json({
    pendingId: pending.id,
    callPhone: smsResult.callPhone,
    callPhonePretty: smsResult.callPhonePretty,
    expiresAt: expiresAt.toISOString(),
  });
}
