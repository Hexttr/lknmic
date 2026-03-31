"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Stethoscope, Users } from "lucide-react";
import { SpecialistIcon } from "@/lib/specialist-icons";

type Card = {
  id: string;
  name: string;
  iconKey: string;
  totalRequests: number;
  hasUnprocessed: boolean;
};

type OverviewData = {
  patientCount: number;
  specialistTypeCount: number;
  activeRequestsCount: number;
  specialistCards: Card[];
};

export function OverviewDashboard() {
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/overview", { cache: "no-store" });
    if (!res.ok) {
      setError("Не удалось загрузить обзор");
      return;
    }
    setData((await res.json()) as OverviewData);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function onCardClick(c: Card) {
    if (!c.hasUnprocessed) return;
    router.push(`/admin/requests?specialistId=${encodeURIComponent(c.id)}`);
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!data) {
    return <p className="text-zinc-500">Загрузка…</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1a1a1a]">Обзор</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Краткая статистика и заявки по специалистам.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0c2847]/10 text-[#0c2847]">
            <Users className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Пациентов
            </p>
            <p className="text-2xl font-semibold tabular-nums text-zinc-900">
              {data.patientCount}
            </p>
            <p className="text-xs text-zinc-500">всего в системе</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
            <Stethoscope className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Специалистов
            </p>
            <p className="text-2xl font-semibold tabular-nums text-zinc-900">
              {data.specialistTypeCount}
            </p>
            <p className="text-xs text-zinc-500">типов в справочнике</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
            <ClipboardList className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Активные заявки
            </p>
            <p className="text-2xl font-semibold tabular-nums text-zinc-900">
              {data.activeRequestsCount}
            </p>
            <p className="text-xs text-zinc-500">не в архиве</p>
          </div>
        </div>
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Заявки по специалистам
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.specialistCards.map((c) => {
          const green = !c.hasUnprocessed;
          const interactive = c.hasUnprocessed;
          const inner = (
            <>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/80 text-[#0c2847] shadow-sm">
                  <SpecialistIcon iconKey={c.iconKey} className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-900">{c.name}</p>
                  <p className="mt-1 text-sm text-zinc-700">
                    Заявок:{" "}
                    <span className="tabular-nums font-medium">
                      {c.totalRequests}
                    </span>
                  </p>
                  {green ? (
                    <p className="mt-2 text-xs text-emerald-900/90">
                      Все заявки в архиве
                    </p>
                  ) : (
                    <p className="mt-2 text-xs font-medium text-red-900">
                      Есть необработанные
                    </p>
                  )}
                </div>
              </div>
            </>
          );

          const cls = `rounded-xl border p-4 shadow-sm transition ${
            green
              ? "border-emerald-300/80 bg-emerald-100/90"
              : "border-red-300/80 bg-red-100/90"
          } ${interactive ? "cursor-pointer hover:ring-2 hover:ring-[#0c2847]/30" : ""}`;

          if (interactive) {
            return (
              <button
                key={c.id}
                type="button"
                className={`${cls} w-full text-left`}
                onClick={() => onCardClick(c)}
              >
                {inner}
              </button>
            );
          }

          return (
            <div key={c.id} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-zinc-500">
        По карточке с необработанными заявками можно перейти в раздел{" "}
        <Link href="/admin/requests" className="text-[#0c2847] underline">
          Заявки
        </Link>
        .
      </p>
    </div>
  );
}
