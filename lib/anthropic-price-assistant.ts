import { prisma } from "@/lib/prisma";
import { APP_SETTING_ANTHROPIC_API_KEY } from "@/lib/app-settings-keys";

type Msg = { role: "user" | "assistant"; content: string };

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

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

  const res = await fetch("https://api.anthropic.com/v1/messages", {
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

  const raw = (await res.json()) as {
    error?: { message?: string };
    content?: { type: string; text?: string }[];
  };

  if (!res.ok) {
    const msg = raw.error?.message ?? res.statusText;
    throw new Error(`anthropic_http: ${msg}`);
  }

  const block = raw.content?.find((c) => c.type === "text");
  const text = block?.text?.trim();
  if (!text) {
    throw new Error("anthropic_empty");
  }

  return text;
}
