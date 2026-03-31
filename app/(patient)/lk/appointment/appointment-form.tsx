"use client";

import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { APPOINTMENT_HOURLY_SLOTS } from "@/lib/appointment-slots";
import { formatDateRuFromIso } from "@/lib/date-format-ru";
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
  const [timeSlot, setTimeSlot] = useState(
    APPOINTMENT_HOURLY_SLOTS[1] ?? "09:00-10:00",
  );
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [bookedSpecialistIds, setBookedSpecialistIds] = useState<Set<string>>(
    () => new Set(),
  );

  const load = useCallback(async () => {
    setError(null);
    const [specRes, aptRes] = await Promise.all([
      fetch("/api/specialist-types", { cache: "no-store" }),
      fetch("/api/patient/appointments", { cache: "no-store" }),
    ]);
    if (!specRes.ok) {
      setError("Не удалось загрузить список специалистов");
      setBookedSpecialistIds(new Set());
      return;
    }
    const data = (await specRes.json()) as { specialistTypes: Spec[] };
    setTypes(data.specialistTypes);
    if (aptRes.ok) {
      const j = (await aptRes.json()) as {
        appointments?: { specialistTypeId: string }[];
      };
      setBookedSpecialistIds(
        new Set((j.appointments ?? []).map((a) => a.specialistTypeId)),
      );
    } else {
      setBookedSpecialistIds(new Set());
    }
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
    if (types.length === 0) return;
    const free = types.filter((t) => !bookedSpecialistIds.has(t.id));
    if (free.length === 0) return;
    if (specialistId === "" || bookedSpecialistIds.has(specialistId)) {
      setSpecialistId(free[0].id);
    }
  }, [types, bookedSpecialistIds, specialistId]);

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
          timeSlot,
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
      <div className="flex items-center gap-3">
        <CalendarClock className="h-7 w-7 shrink-0 text-[#0c2847]" aria-hidden />
        <h1 className="text-xl font-semibold text-zinc-900">Запись на приём</h1>
      </div>
      <p className="mt-2 text-sm text-zinc-600">
        Можно подать заявки к разным специалистам по отдельности. К одному
        специалисту — не более одной активной заявки. Укажите дату, интервал и
        врача; мы перезвоним для уточнения.
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
      ) : types.every((t) => bookedSpecialistIds.has(t.id)) ? (
        <p className="mt-8 text-sm text-amber-900">
          По всем специалистам у вас уже есть активные заявки. Отмените одну из
          них в личном кабинете, если нужно изменить запись.
        </p>
      ) : (
        <>
          <fieldset className="mt-6">
            <legend className="text-sm font-medium text-zinc-800">
              Специалист
            </legend>
            <div className="mt-3 grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {types.map((t) => {
                const booked = bookedSpecialistIds.has(t.id);
                return (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-sm transition ${
                      booked
                        ? "cursor-not-allowed border-zinc-200 bg-zinc-50/80 opacity-70"
                        : specialistId === t.id
                          ? "cursor-pointer border-[#0c2847] bg-[#0c2847]/5 ring-1 ring-[#0c2847]"
                          : "cursor-pointer border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="specialist"
                      value={t.id}
                      checked={specialistId === t.id}
                      disabled={booked}
                      onChange={() => setSpecialistId(t.id)}
                      className="sr-only"
                    />
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-[#0c2847]">
                      <SpecialistIcon iconKey={t.iconKey} className="h-5 w-5" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium text-zinc-900">{t.name}</span>
                      {booked ? (
                        <span className="text-xs font-normal text-zinc-500">
                          Уже есть активная заявка
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
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
              <span className="text-xs text-zinc-600">
                Формат:{" "}
                <span className="font-medium text-zinc-800">
                  {formatDateRuFromIso(date)}
                </span>
              </span>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-800">
                Интервал (1 час)
              </span>
              <select
                required
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
              >
                {APPOINTMENT_HOURLY_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
              <span className="text-xs text-zinc-500">
                С 8:00 до 18:00, по часу
              </span>
            </label>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={
                submitting || bookedSpecialistIds.has(specialistId)
              }
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
