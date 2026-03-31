"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { SpecialistIcon } from "@/lib/specialist-icons";

type Spec = { id: string; name: string; iconKey: string };

function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function AppointmentForm() {
  const router = useRouter();
  const [types, setTypes] = useState<Spec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specialistId, setSpecialistId] = useState("");
  const [date, setDate] = useState(todayISODate);
  const [time, setTime] = useState("09:00");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/specialist-types", { cache: "no-store" });
    if (!res.ok) {
      setError("Не удалось загрузить список специалистов");
      return;
    }
    const data = (await res.json()) as { specialistTypes: Spec[] };
    setTypes(data.specialistTypes);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (types.length > 0 && specialistId === "") {
      setSpecialistId(types[0].id);
    }
  }, [types, specialistId]);

  const minDate = useMemo(() => todayISODate(), []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!specialistId) {
      setError("Выберите специалиста");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/patient/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialistTypeId: specialistId,
          date,
          time,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось отправить заявку");
        return;
      }
      setDone(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-6 py-10 text-center">
        <p className="text-lg font-medium text-emerald-950">
          Спасибо за обращение!
        </p>
        <p className="mt-4 text-sm leading-relaxed text-emerald-900/90">
          Наши специалисты скоро свяжутся с Вами и уточнят подробности!
        </p>
        <Link
          href="/lk"
          className="mt-8 inline-block rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Вернуться в личный кабинет
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <h1 className="text-xl font-semibold text-zinc-900">Запись на приём</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Укажите желаемую дату, время и специалиста. Мы обработаем заявку и
        перезвоним для уточнения.
      </p>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-zinc-500">Загрузка…</p>
      ) : types.length === 0 ? (
        <p className="mt-8 text-sm text-amber-800">
          Список специалистов пока пуст. Обратитесь в регистратуру.
        </p>
      ) : (
        <>
          <fieldset className="mt-6">
            <legend className="text-sm font-medium text-zinc-800">
              Специалист
            </legend>
            <div className="mt-3 grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {types.map((t) => (
                <label
                  key={t.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm transition ${
                    specialistId === t.id
                      ? "border-[#0c2847] bg-[#0c2847]/5 ring-1 ring-[#0c2847]"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="specialist"
                    value={t.id}
                    checked={specialistId === t.id}
                    onChange={() => setSpecialistId(t.id)}
                    className="sr-only"
                  />
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-[#0c2847]">
                    <SpecialistIcon iconKey={t.iconKey} className="h-5 w-5" />
                  </span>
                  <span className="font-medium text-zinc-900">{t.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-800">Дата</span>
              <input
                type="date"
                required
                min={minDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-800">Время</span>
              <input
                type="time"
                required
                step={300}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
              />
            </label>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[#ee0000] px-6 py-3 text-sm font-semibold text-white hover:bg-[#cc0000] disabled:opacity-50"
            >
              {submitting ? "Отправка…" : "Записаться"}
            </button>
            <Link
              href="/lk"
              className="inline-flex items-center rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Отмена
            </Link>
          </div>
        </>
      )}
    </form>
  );
}
