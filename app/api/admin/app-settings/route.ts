import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { APP_SETTING_ANTHROPIC_API_KEY } from "@/lib/app-settings-keys";
import { prisma } from "@/lib/prisma";

/** Источник ключа Anthropic для UI: env имеет приоритет над БД. */
export async function GET() {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

  const hasEnv = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const dbRow = await prisma.appSetting.findUnique({
    where: { key: APP_SETTING_ANTHROPIC_API_KEY },
    select: { value: true },
  });
  const hasDb = Boolean(dbRow?.value?.trim());

  let anthropicKeySource: "env" | "database" | "none";
  if (hasEnv) anthropicKeySource = "env";
  else if (hasDb) anthropicKeySource = "database";
  else anthropicKeySource = "none";

  return NextResponse.json({ anthropicKeySource });
}

export async function PUT(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "Ключ задан в переменной окружения ANTHROPIC_API_KEY. Удалите её, чтобы сохранять ключ здесь.",
      },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const raw = (body as { anthropicApiKey?: unknown }).anthropicApiKey;
  const key =
    typeof raw === "string" ? raw.trim() : "";

  if (!key) {
    await prisma.appSetting.deleteMany({
      where: { key: APP_SETTING_ANTHROPIC_API_KEY },
    });
    return NextResponse.json({ ok: true, anthropicKeySource: "none" as const });
  }

  if (key.length < 10 || key.length > 500) {
    return NextResponse.json({ error: "Некорректная длина ключа" }, { status: 400 });
  }

  await prisma.appSetting.upsert({
    where: { key: APP_SETTING_ANTHROPIC_API_KEY },
    create: { key: APP_SETTING_ANTHROPIC_API_KEY, value: key },
    update: { value: key },
  });

  return NextResponse.json({ ok: true, anthropicKeySource: "database" as const });
}
