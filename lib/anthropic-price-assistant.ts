import { fetch as undiciFetch, ProxyAgent } from "undici";

import { prisma } from "@/lib/prisma";
import { APP_SETTING_ANTHROPIC_API_KEY } from "@/lib/app-settings-keys";

type Msg = { role: "user" | "assistant"; content: string };

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

/** Исходящий HTTPS-прокси только для Anthropic (например EU/US VPS). См. ANTHROPIC_HTTPS_PROXY. */
function anthropicFetch(
  input: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const proxyUrl =
    process.env.ANTHROPIC_HTTPS_PROXY?.trim() ||
    process.env.ANTHROPIC_PROXY?.trim();
  if (!proxyUrl) {
    return fetch(input, init);
  }
  const agent = new ProxyAgent(proxyUrl);
  return undiciFetch(
    input,
    { ...init, dispatcher: agent } as Parameters<typeof undiciFetch>[1],
  ) as unknown as Promise<Response>;
}

/** Сначала `ANTHROPIC_API_KEY` из окружения, иначе значение из админки (БД). */
export async function getAnthropicApiKey(): Promise<string | null> {
  const fromEnv = process.env.ANTHROPIC_API_KEY?.trim();
  if (fromEnv) return fromEnv;

  const row = await prisma.appSetting.findUnique({
    where: { key: APP_SETTING_ANTHROPIC_API_KEY },
    select: { value: true },
  });
  const v = row?.value?.trim();
  return v || null;
}

export async function runPriceAssistantModel(
  system: string,
  messages: Msg[],
): Promise<string> {
  const key = await getAnthropicApiKey();
  if (!key) {
    throw new Error("missing_api_key");
  }

  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

  const res = await anthropicFetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system,
      messages,
    }),
  });

  const bodyText = await res.text();
  let raw: {
    error?: { message?: string; type?: string };
    content?: { type: string; text?: string }[];
  };
  try {
    raw = JSON.parse(bodyText) as typeof raw;
  } catch {
    throw new Error(
      `anthropic_http:${res.status}:${bodyText.slice(0, 300)}`,
    );
  }

  if (!res.ok) {
    const msg = raw.error?.message ?? res.statusText;
    throw new Error(`anthropic_http:${res.status}:${msg}`);
  }

  const block = raw.content?.find((c) => c.type === "text");
  const text = block?.text?.trim();
  if (!text) {
    throw new Error("anthropic_empty");
  }

  return text;
}

/**
 * Человекочитаемое сообщение для UI (без утечки сырого ответа в прод).
 */
export function formatAnthropicErrorForUser(err: unknown): string {
  if (!(err instanceof Error)) {
    return "Ошибка ИИ. Попробуйте позже.";
  }
  const m = err.message;
  if (m === "missing_api_key") {
    return "Ключ API не настроен.";
  }
  if (m === "anthropic_empty") {
    return "Пустой ответ от модели. Попробуйте ещё раз.";
  }

  const http = /^anthropic_http:(\d+):([\s\S]+)$/.exec(m);
  if (http) {
    const status = parseInt(http[1], 10);
    const rest = http[2].toLowerCase();

    if (status === 401) {
      return "Ключ API отклонён. Проверьте ключ в Настройки → AI или переменную ANTHROPIC_API_KEY.";
    }
    const looksGeoRestricted =
      (rest.includes("not available") && rest.includes("country")) ||
      (rest.includes("unsupported") && rest.includes("region")) ||
      rest.includes("geographic");
    if (looksGeoRestricted) {
      return (
        "Доступ к Anthropic с IP вашего сервера ограничен по региону. " +
        "VPN в браузере не помогает: запрос к API выполняет машина, где запущен сайт. " +
        "Нужен VPN/прокси на сервере или хостинг в поддерживаемой стране."
      );
    }
    if (status === 403) {
      return (
        "Доступ к Anthropic запрещён (403). Часто так бывает для серверов в РФ или при ограничениях аккаунта. " +
        "Проверьте ключ и консоль Anthropic; при необходимости настройте исходящий прокси на сервере (ANTHROPIC_HTTPS_PROXY в .env)."
      );
    }
    if (status === 404 || rest.includes("model:") || rest.includes("model not found")) {
      return (
        "Неверное имя модели. Задайте ANTHROPIC_MODEL в окружении (актуальный ID в консоли Anthropic)."
      );
    }
    if (status === 400) {
      return `Запрос отклонён сервисом: ${http[2].slice(0, 180)}`;
    }
    if (status === 429) {
      return "Слишком много запросов к Anthropic. Подождите немного.";
    }
    return (
      "Сервис Anthropic вернул ошибку. Если сервер в РФ или за жёстким firewall, " +
      "часто нужен выход в интернет из региона с поддержкой API."
    );
  }

  if (
    m.includes("fetch failed") ||
    m.includes("ECONNREFUSED") ||
    m.includes("ENOTFOUND") ||
    m.includes("ETIMEDOUT")
  ) {
    return "Не удалось связаться с api.anthropic.com с сервера. Проверьте сеть, DNS и firewall.";
  }

  return "Ошибка ИИ. Попробуйте позже.";
}
