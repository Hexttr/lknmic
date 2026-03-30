"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/** Красивое отображение для текста (шаг «позвоните»), не для редактирования */
function formatRuMobile(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length === 0) return "+7";
  let out = "+7 ";
  if (d.length <= 3) {
    out += `(${d}`;
    if (d.length === 3) out += ") ";
    return out;
  }
  out += `(${d.slice(0, 3)}) `;
  const rest = d.slice(3);
  if (rest.length <= 3) {
    out += rest;
    return out;
  }
  if (rest.length <= 5) {
    out += `${rest.slice(0, 3)}-${rest.slice(3)}`;
    return out;
  }
  out += `${rest.slice(0, 3)}-${rest.slice(3, 5)}-${rest.slice(5)}`;
  return out;
}

export function LoginForm() {
  const router = useRouter();
  const [digits, setDigits] = useState("");
  const [step, setStep] = useState<"phone" | "call">("phone");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [callPhone, setCallPhone] = useState("");
  const [callPhonePretty, setCallPhonePretty] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const display = formatRuMobile(digits);

  const onChangePhone = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "");
    if (raw.startsWith("8")) raw = "7" + raw.slice(1);
    if (raw.startsWith("7")) raw = raw.slice(1);
    raw = raw.slice(0, 10);
    if (raw.length > 0 && raw[0] !== "9") return;
    setDigits(raw);
    setError(null);
  }, []);

  const onPastePhone = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData("text");
      let raw = text.replace(/\D/g, "");
      if (raw.startsWith("8")) raw = "7" + raw.slice(1);
      if (raw.startsWith("7")) raw = raw.slice(1);
      raw = raw.slice(0, 10);
      if (raw.length > 0 && raw[0] !== "9") {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      setDigits(raw);
      setError(null);
    },
    [],
  );

  const submitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (digits.length !== 10 || digits[0] !== "9") {
      setError("Введите полный мобильный номер (начинается с 9)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/callcheck/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+7${digits}` }),
      });
      const data = (await res.json()) as {
        error?: string;
        pendingId?: string;
        callPhone?: string;
        callPhonePretty?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Не удалось начать проверку");
        return;
      }
      if (!data.pendingId || !data.callPhonePretty || !data.callPhone) {
        setError("Некорректный ответ сервера");
        return;
      }
      setPendingId(data.pendingId);
      setCallPhone(data.callPhone);
      setCallPhonePretty(data.callPhonePretty);
      setStep("call");
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== "call" || !pendingId) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch(`/api/auth/callcheck/pending/${pendingId}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as { ok?: boolean; role?: string };
          if (data.ok) {
            const dest = data.role === "ADMIN" ? "/admin" : "/lk";
            router.replace(dest);
            router.refresh();
            return;
          }
        }
        if (res.status === 410) {
          setError("Время ожидания истекло. Запросите код ещё раз.");
          setStep("phone");
          setPendingId(null);
        }
      } catch {
        if (!cancelled) setError("Ошибка проверки статуса");
      }
    };

    void tick();
    const id = window.setInterval(tick, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [step, pendingId, router]);

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center gap-4">
          <Image
            src="/logo.png"
            alt="Логотип"
            width={180}
            height={72}
            className="h-auto w-auto max-w-[200px] object-contain"
            priority
          />
          <h1 className="text-center text-xl font-semibold text-zinc-900">
            Личный кабинет пациента
          </h1>
          <p className="text-center text-sm text-zinc-600">
            Вход по номеру телефона
          </p>
        </div>

        {step === "phone" && (
          <form onSubmit={submitPhone} className="flex flex-col gap-4">
            <label className="text-sm font-medium text-zinc-800" htmlFor="phone">
              Номер телефона
            </label>
            <p className="text-xs text-zinc-500">
              Мобильный РФ: после +7 — 10 цифр, начинается с 9
            </p>
            <div className="flex min-h-[52px] items-stretch overflow-hidden rounded-lg border border-zinc-300 bg-white ring-zinc-400 focus-within:border-zinc-500 focus-within:ring-2">
              <span
                className="flex shrink-0 items-center border-r border-zinc-200 bg-zinc-50 px-3 text-lg font-medium tabular-nums text-zinc-700 select-none"
                aria-hidden
              >
                +7
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                name="phone"
                placeholder="9123456789"
                value={digits}
                maxLength={10}
                onChange={onChangePhone}
                onPaste={onPastePhone}
                className="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-lg tracking-wide text-zinc-900 outline-none tabular-nums placeholder:text-zinc-400"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || digits.length !== 10}
              className="rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Отправка…" : "Продолжить"}
            </button>
          </form>
        )}

        {step === "call" && (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm text-zinc-700">
              Позвоните на бесплатный номер{" "}
              <span className="font-semibold text-zinc-900">{callPhonePretty}</span>{" "}
              с номера{" "}
              <span className="font-medium tabular-nums">{display}</span>.
              Звонок будет коротким и для вас бесплатным.
            </p>
            <a
              href={`tel:${callPhone}`}
              className="inline-flex justify-center rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              Позвонить
            </a>
            <p className="text-sm text-zinc-500">Ожидаем подтверждения…</p>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setPendingId(null);
                setCallPhone("");
                setCallPhonePretty("");
                setError(null);
              }}
              className="text-sm text-zinc-600 underline hover:text-zinc-900"
            >
              Изменить номер
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
