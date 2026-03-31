"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SpecialistIcon } from "@/lib/specialist-icons";
import { formatDateRuFromIso } from "@/lib/date-format-ru";

export type LkActiveAppointmentData = {
  id: string;
  date: string;
  timeSlot: string;
  adminDate: string | null;
  adminTime: string | null;
  specialistType: { name: string; iconKey: string };
};

function displayWhen(a: LkActiveAppointmentData): { dateLabel: string; timeLabel: string } {
  const exact = Boolean(a.adminDate?.trim() && a.adminTime?.trim());
  if (exact) {
    return {
      dateLabel: formatDateRuFromIso(a.adminDate!),
      timeLabel: a.adminTime!,
    };
  }
  return {
    dateLabel: formatDateRuFromIso(a.date),
    timeLabel: a.timeSlot,
  };
}

export function LkActiveAppointment({
  initial,
}: {
  initial: LkActiveAppointmentData | null;
}) {
  const router = useRouter();
  const [data, setData] = useState<LkActiveAppointmentData | null>(initial);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!data) {
    return null;
  }

  const when = displayWhen(data);
  const exactAdmin = Boolean(data.adminDate?.trim() && data.adminTime?.trim());

  async function cancel() {
    if (!data) return;
    if (!confirm("Отменить запись на приём?")) return;
    const id = data.id;
    setError(null);
    setCancelling(true);
    try {
      const res = await fetch(`/api/patient/appointments/${id}`, {
        method: "DELETE",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error === "cannot_cancel" ? "Нельзя отменить эту заявку." : "Не удалось отменить");
        return;
      }
      setData(null);
      router.refresh();
    } finally {
      setCancelling(false);
    }
  }

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/90 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Ваша заявка на приём</h2>
      <p className="mt-1 text-sm text-zinc-600">
        {exactAdmin
          ? "Дата и время согласованы с клиникой."
          : "Предварительные дата и время. После звонка администратора они могут измениться."}
      </p>
      <div className="mt-4 flex flex-wrap items-start gap-3 rounded-xl border border-white/80 bg-white px-4 py-4 shadow-sm">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0c2847]/10 text-[#0c2847]">
          <SpecialistIcon iconKey={data.specialistType.iconKey} className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-zinc-900">{data.specialistType.name}</p>
          <p className="mt-2 text-sm text-zinc-800">
            <span className="text-zinc-500">Дата: </span>
            {when.dateLabel}
          </p>
          <p className="mt-1 text-sm text-zinc-800">
            <span className="text-zinc-500">Время: </span>
            {when.timeLabel}
          </p>
        </div>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => void cancel()}
        disabled={cancelling}
        className="mt-4 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
      >
        {cancelling ? "Отмена…" : "Отменить запись"}
      </button>
    </section>
  );
}
