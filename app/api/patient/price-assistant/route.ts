import { NextRequest, NextResponse } from "next/server";
import { PriceCatalogNodeKind } from "@prisma/client";
import {
  formatAnthropicErrorForUser,
  getAnthropicApiKey,
  runPriceAssistantModel,
} from "@/lib/anthropic-price-assistant";
import { getShowPriceAssistantChat } from "@/lib/show-price-assistant-flag";
import { getLkSession } from "@/lib/lk-session";
import { prisma } from "@/lib/prisma";
import { priceAssistantRateLimitOk } from "@/lib/rate-limit";

type IncomingMsg = { role?: unknown; content?: unknown };

function extractSearchTokens(text: string): string[] {
  const t = text
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/gi, " ");
  const parts = t.split(/\s+/).filter((w) => w.length >= 3);
  return [...new Set(parts)].slice(0, 8);
}

async function fetchRelevantServices(
  userText: string,
): Promise<{ title: string; priceText: string | null }[]> {
  const tokens = extractSearchTokens(userText);
  if (tokens.length === 0) {
    return prisma.priceCatalogNode.findMany({
      where: { kind: PriceCatalogNodeKind.SERVICE },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { title: true, priceText: true },
    });
  }

  return prisma.priceCatalogNode.findMany({
    where: {
      kind: PriceCatalogNodeKind.SERVICE,
      OR: tokens.map((tok) => ({
        searchBlob: { contains: tok },
      })),
    },
    take: 45,
    select: { title: true, priceText: true },
  });
}

export async function POST(request: NextRequest) {
  const lk = await getLkSession();
  if (!lk.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: lk.status });
  }

  if (!(await priceAssistantRateLimitOk(lk.userId))) {
    return NextResponse.json(
      { error: "Слишком много запросов. Подождите минуту." },
      { status: 429 },
    );
  }

  if (!(await getShowPriceAssistantChat())) {
    return NextResponse.json(
      { error: "Подбор по ИИ отключён в настройках." },
      { status: 403 },
    );
  }

  if (!(await getAnthropicApiKey())) {
    return NextResponse.json(
      { error: "Подбор по ИИ недоступен: не настроен ключ API." },
      { status: 503 },
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

  const rawMessages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return NextResponse.json({ error: "messages_required" }, { status: 400 });
  }

  const parsed: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of rawMessages) {
    if (typeof m !== "object" || m === null) continue;
    const r = (m as IncomingMsg).role;
    const c = (m as IncomingMsg).content;
    if (r !== "user" && r !== "assistant") continue;
    const content = typeof c === "string" ? c.trim() : "";
    if (!content || content.length > 8000) continue;
    parsed.push({ role: r, content });
  }

  if (parsed.length === 0 || parsed[parsed.length - 1]?.role !== "user") {
    return NextResponse.json({ error: "invalid_messages" }, { status: 400 });
  }

  const lastUser = [...parsed].reverse().find((m) => m.role === "user");
  const lastUserText = lastUser?.content ?? "";

  const hits = await fetchRelevantServices(lastUserText);
  const catalogBlock = hits
    .map((h) => {
      const p = h.priceText ?? "";
      return p ? `${h.title} — ${p}` : h.title;
    })
    .join("\n");

  const system = `Ты помощник по выбору платных медицинских услуг в НМИЦ здоровья детей.
Отвечай только на русском. Не ставь диагнозы и не давай медицинских рекомендаций вне списка услуг.
Используй только услуги из фрагмента прайса ниже. Если ни одна услуга не подходит, честно скажи об этом и предложи обратиться к врачу или в регистратуру.
Фрагмент прайса (название и цена):
${catalogBlock || "(пусто — скажи, что прайс не загружен или запрос слишком общий)"}`;

  const trimmed = parsed.slice(-8);
  const anthropicMessages: { role: "user" | "assistant"; content: string }[] =
    [];
  for (const m of trimmed) {
    if (anthropicMessages.length === 0 && m.role === "assistant") continue;
    anthropicMessages.push({ role: m.role, content: m.content });
  }

  try {
    const reply = await runPriceAssistantModel(system, anthropicMessages);
    return NextResponse.json({ reply });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "missing_api_key") {
      return NextResponse.json({ error: "Ключ API не настроен" }, { status: 503 });
    }
    return NextResponse.json(
      { error: formatAnthropicErrorForUser(e) },
      { status: 502 },
    );
  }
}
