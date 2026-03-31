"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, ClipboardList } from "lucide-react";
import { SpecialistIcon } from "@/lib/specialist-icons";
import { formatDateRuFromIso } from "@/lib/date-format-ru";

type AppointmentRow = {
  id: string;
  date: string;
  timeSlot: string;
  status: "NEW" | "AWAITING_PATIENT" | "ARCHIVED";
  adminDate: string | null;
  adminTime: string | null;
  createdAt: string;
  user: { phone: string };
  specialistType: { name: string; iconKey: string };
};

const STATUS_LABEL: Record<AppointmentRow["status"], string> = {
  NEW: "Новая",
  AWAITING_PATIENT: "Ожидаем пациента",
  ARCHIVED: "Архив",
};

export function RequestsManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const specialistFilter = searchParams.get("specialistId")?.trim() ?? "";
  const archiveView = searchParams.get("archive") === "1";

  function setArchiveView(on: boolean) {
    const p = new URLSearchParams(searchParams.toString());
    if (on) {
      p.set("archive", "1");
    } else {
      p.delete("archive");
    }
    const q = p.toString();
    router.replace(q ? `/admin/requests?${q}` : "/admin/requests");
  }

  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editRow, setEditRow] = useState<AppointmentRow | null>(null);
  const [status, setStatus] = useState<AppointmentRow["status"]>("NEW");
  const [adminDate, setAdminDate] = useState("");
  const [adminTime, setAdminTime] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const params = new URLSearchParams();
    if (specialistFilter) {
      params.set("specialistId", specialistFilter);
    }
    if (archiveView) {
      params.set("archived", "1");
    }
    const q = params.toString();
    const res = await fetch(
      `/api/admin/appointments${q ? `?${q}` : ""}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      setError("Не удалось загрузить заявки");
      return;
    }
    const data = (await res.json()) as { appointments: AppointmentRow[] };
    setRows(data.appointments);
  }, [specialistFilter, archiveView]);

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

  function openEdit(r: AppointmentRow) {
    setEditRow(r);
    setStatus(r.status);
    setAdminDate(r.adminDate ?? "");
    setAdminTime(r.adminTime ?? "");
    setError(null);
  }

  function closeEdit() {
    setEditRow(null);
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editRow) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/appointments/${editRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminDate: adminDate.trim() || null,
          adminTime: adminTime.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось сохранить");
        return;
      }
      closeEdit();
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <ClipboardList
              className="h-8 w-8 shrink-0 text-[#0c2847]"
              aria-hidden
            />
            <h1 className="text-2xl font-semibold text-[#1a1a1a]">
              {archiveView ? "Архив заявок" : "Заявки"}
            </h1>
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            {archiveView
              ? "Заявки со статусом «Архив». Активные заявки — в разделе «Заявки»."
              : "Заявки на приём из личных кабинетов пациентов. Укажите согласованные дату и время после звонка клиенту."}
          </p>
          {specialistFilter && (
            <p className="mt-2 text-sm text-[#0c2847]">
              Фильтр по специалисту активен.{" "}
              <a
                href={
                  archiveView ? "/admin/requests?archive=1" : "/admin/requests"
                }
                className="underline"
              >
                Показать все
              </a>
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setArchiveView(!archiveView)}
          aria-pressed={archiveView}
          className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition ${
            archiveView
              ? "border-[#0c2847] bg-[#0c2847] text-white"
              : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
          }`}
        >
          <Archive className="h-4 w-4" aria-hidden />
          Архив
        </button>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-zinc-500">Загрузка…</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-zinc-600">
          {archiveView ? "В архиве пока нет записей." : "Заявок пока нет."}
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-[900px] w-full text-left text-sm text-zinc-900">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-700">
              <tr>
                <th className="px-4 py-3">Телефон</th>
                <th className="px-4 py-3">Специалист</th>
                <th className="px-4 py-3">Предпочт. дата</th>
                <th className="px-4 py-3">Предпочт. время</th>
                <th className="px-4 py-3">Согласовано (дата)</th>
                <th className="px-4 py-3">Согласовано (время)</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-3 font-mono text-zinc-900">
                    {r.user.phone}
                  </td>
                  <td className="px-4 py-3 text-zinc-900">
                    <span className="inline-flex items-center gap-2">
                      <SpecialistIcon
                        iconKey={r.specialistType.iconKey}
                        className="h-4 w-4 shrink-0 text-[#0c2847]"
                      />
                      {r.specialistType.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-900">
                    {formatDateRuFromIso(r.date)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-900">
                    {r.timeSlot}
                  </td>
                  <td className="px-4 py-3 text-zinc-900">
                    {r.adminDate
                      ? formatDateRuFromIso(r.adminDate)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-900">
                    {r.adminTime ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-medium ${
                        r.status === "ARCHIVED"
                          ? "bg-zinc-200 text-zinc-800"
                          : r.status === "NEW"
                            ? "bg-amber-100 text-amber-950"
                            : "bg-sky-100 text-sky-950"
                      }`}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50"
                    >
                      Обработать
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => closeEdit()}
        >
          <div
            className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[#1a1a1a]">
              Заявка
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              {editRow.user.phone} · {editRow.specialistType.name}
            </p>
            <form onSubmit={submitEdit} className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-zinc-800">Статус</span>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as AppointmentRow["status"])
                  }
                  className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
                >
                  <option value="NEW">Новая</option>
                  <option value="AWAITING_PATIENT">Ожидаем пациента</option>
                  <option value="ARCHIVED">Архив</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-zinc-800">
                  Согласованная дата (необязательно)
                </span>
                <input
                  type="date"
                  value={adminDate}
                  onChange={(e) => setAdminDate(e.target.value)}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
                />
                {adminDate && (
                  <span className="text-xs text-zinc-500">
                    {formatDateRuFromIso(adminDate)}
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-zinc-800">
                  Согласованное время (необязательно)
                </span>
                <input
                  type="time"
                  value={adminTime}
                  onChange={(e) => setAdminTime(e.target.value)}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-[#ee0000] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saving ? "Сохранение…" : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
