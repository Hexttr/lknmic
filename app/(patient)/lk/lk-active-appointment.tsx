"use client";

import { XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

function ActiveAppointmentCard({
  item,
  onRemoved,
}: {
  item: LkActiveAppointmentData;
  onRemoved: (id: string) => void;
}) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const when = displayWhen(item);
  const exactAdmin = Boolean(item.adminDate?.trim() && item.adminTime?.trim());

  async function cancel() {
    if (!confirm("Отменить эту запись на приём?")) return;
    const id = item.id;
    setError(null);
    setCancelling(true);
    try {
      const res = await fetch(`/api/patient/appointments/${id}`, {
        method: "DELETE",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(
          j.error === "cannot_cancel"
            ? "Нельзя отменить эту заявку."
            : "Не удалось отменить",
        );
        return;
      }
      onRemoved(id);
      router.refresh();
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-emerald-600 bg-white px-4 py-4 shadow-sm">
      <p className="mt-1 text-xs font-bold text-zinc-800 sm:text-sm">
        {exactAdmin
          ? "Дата и время согласованы с клиникой."
          : "Предварительные дата и время. После звонка администратора они могут измениться."}
      </p>
      <div className="mt-3 flex flex-wrap items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0c2847]/10 text-[#0c2847]">
          <SpecialistIcon iconKey={item.specialistType.iconKey} className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-zinc-900">{item.specialistType.name}</p>
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
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => void cancel()}
          disabled={cancelling}
          className="inline-flex max-w-[220px] items-center justify-center gap-2 rounded-lg bg-[#ee0000] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#cc0000] disabled:opacity-50"
        >
          <XCircle className="h-4 w-4 shrink-0" aria-hidden />
          {cancelling ? "Отмена…" : "Отменить запись"}
        </button>
      </div>
    </div>
  );
}

export function LkActiveAppointments({
  initial,
}: {
  initial: LkActiveAppointmentData[];
}) {
  const [items, setItems] = useState(initial);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/95 p-5 shadow-sm">
      <h2 className="text-center text-lg font-semibold uppercase tracking-wide text-zinc-900">
        {items.length === 1 ? "Ваша заявка на приём" : "Ваши заявки на приём"}
      </h2>
      <p className="mt-1 text-sm text-emerald-950/80">
        Вы можете подать заявки к разным специалистам. Каждую активную заявку можно
        отменить отдельно.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {items.map((item) => (
          <ActiveAppointmentCard
            key={item.id}
            item={item}
            onRemoved={(id) =>
              setItems((prev) => prev.filter((x) => x.id !== id))
            }
          />
        ))}
      </div>
    </section>
  );
}
