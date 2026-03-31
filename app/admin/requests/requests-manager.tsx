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
  status: "NEW" | "AWAITING_PATIENT" | "CANCELLED" | "ARCHIVED";
  adminDate: string | null;
  adminTime: string | null;
  createdAt: string;
  user: { phone: string };
  specialistType: { name: string; iconKey: string };
};

const STATUS_LABEL: Record<AppointmentRow["status"], string> = {
  NEW: "Новая",
  AWAITING_PATIENT: "Ожидаем пациента",
  CANCELLED: "Отменена",
  ARCHIVED: "Архив",
};

type SpecialistOption = { id: string; name: string };

function formatReceivedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export function RequestsManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const specialistFilter = searchParams.get("specialistId")?.trim() ?? "";
  const archiveView = searchParams.get("archive") === "1";
  const sortOrder = searchParams.get("order")?.trim().toLowerCase() === "asc" ? "asc" : "desc";

  function replaceQuery(next: {
    specialistId?: string | null;
    archive?: boolean;
    order?: "asc" | "desc";
  }) {
    const p = new URLSearchParams(searchParams.toString());
    if (next.specialistId !== undefined) {
      if (next.specialistId) {
        p.set("specialistId", next.specialistId);
      } else {
        p.delete("specialistId");
      }
    }
    if (next.archive !== undefined) {
      if (next.archive) {
        p.set("archive", "1");
      } else {
        p.delete("archive");
      }
    }
    if (next.order !== undefined) {
      if (next.order === "desc") {
        p.delete("order");
      } else {
        p.set("order", "asc");
      }
    }
    const q = p.toString();
    router.replace(q ? `/admin/requests?${q}` : "/admin/requests");
  }

  function setArchiveView(on: boolean) {
    replaceQuery({ archive: on });
  }

  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editRow, setEditRow] = useState<AppointmentRow | null>(null);
  const [status, setStatus] = useState<AppointmentRow["status"]>("NEW");
  const [adminDate, setAdminDate] = useState("");
  const [adminTime, setAdminTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [specialists, setSpecialists] = useState<SpecialistOption[]>([]);

  const load = useCallback(async () => {
    setError(null);
    const params = new URLSearchParams();
    if (specialistFilter) {
      params.set("specialistId", specialistFilter);
    }
    if (archiveView) {
      params.set("archived", "1");
    }
    if (sortOrder === "asc") {
      params.set("order", "asc");
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
  }, [specialistFilter, archiveView, sortOrder]);

  const loadSpecialists = useCallback(async () => {
    const res = await fetch("/api/admin/specialist-types", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      specialistTypes: SpecialistOption[];
    };
    setSpecialists(data.specialistTypes ?? []);
  }, []);

  useEffect(() => {
    void loadSpecialists();
  }, [loadSpecialists]);

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
      window.dispatchEvent(new Event("nczd-admin-pending-refresh"));
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
        </div>
        <button
          type="button"
          onClick={() => setArchiveView(!archiveView)}
          aria-pressed={archiveView}
          className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition ${
            archiveView
              ? "border-[#0c2847] bg-[#0c2847] text-white"
              : "border-transparent bg-[#ee0000] text-white hover:bg-[#cc0000]"
          }`}
        >
          <Archive className="h-4 w-4" aria-hidden />
          Архив
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-800">Специалист</span>
          <select
            value={specialistFilter}
            onChange={(e) =>
              replaceQuery({ specialistId: e.target.value || null })
            }
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          >
            <option value="">Все специалисты</option>
            {specialists.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[220px] flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-800">
            По времени поступления
          </span>
          <select
            value={sortOrder}
            onChange={(e) =>
              replaceQuery({
                order: e.target.value === "asc" ? "asc" : "desc",
              })
            }
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          >
            <option value="desc">Сначала новые</option>
            <option value="asc">Сначала старые</option>
          </select>
        </label>
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
        <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100/80 shadow-sm">
          <table className="w-full max-w-full border-collapse text-left text-xs text-zinc-900 sm:text-sm">
              <thead className="border-b-2 border-zinc-300 bg-zinc-100 text-[10px] font-semibold uppercase leading-tight text-zinc-700 sm:text-xs">
                <tr>
                  <th className="px-2 py-3 sm:px-3">Телефон</th>
                  <th className="px-2 py-3 sm:px-3">Поступила</th>
                  <th className="px-2 py-3 sm:px-3">Специалист</th>
                  <th className="px-2 py-3 sm:px-3">
                    <span className="block normal-case">Желаемое</span>
                    <span className="font-normal normal-case text-zinc-500">
                      дата / время
                    </span>
                  </th>
                  <th className="px-2 py-3 sm:px-3">
                    <span className="block normal-case">Согласовано</span>
                    <span className="font-normal normal-case text-zinc-500">
                      дата / время
                    </span>
                  </th>
                  <th className="px-2 py-3 text-center sm:px-3">Статус</th>
                  <th className="px-2 py-3 sm:px-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, index) => (
                  <tr
                    key={r.id}
                    className={`border-b border-zinc-200 transition-colors last:border-b-0 ${
                      index % 2 === 0
                        ? "bg-white hover:bg-emerald-50/40"
                        : "bg-zinc-50/95 hover:bg-emerald-50/50"
                    }`}
                  >
                    <td className="break-all px-2 py-3 font-mono text-[11px] sm:px-3 sm:py-3.5 sm:text-sm">
                      {r.user.phone}
                    </td>
                    <td className="px-2 py-3 text-[11px] text-zinc-800 sm:px-3 sm:py-3.5 sm:text-sm">
                      {formatReceivedAt(r.createdAt)}
                    </td>
                    <td className="min-w-0 px-2 py-3 sm:px-3 sm:py-3.5">
                      <span className="inline-flex max-w-full items-center gap-1.5">
                        <SpecialistIcon
                          iconKey={r.specialistType.iconKey}
                          className="h-4 w-4 shrink-0 text-[#0c2847]"
                        />
                        <span className="min-w-0 break-words leading-snug">
                          {r.specialistType.name}
                        </span>
                      </span>
                    </td>
                    <td className="min-w-0 px-2 py-3 sm:px-3 sm:py-3.5">
                      <div className="space-y-0.5 leading-tight">
                        <div className="whitespace-nowrap">
                          {formatDateRuFromIso(r.date)}
                        </div>
                        <div className="font-mono text-[11px] text-zinc-600 sm:text-xs">
                          {r.timeSlot}
                        </div>
                      </div>
                    </td>
                    <td className="min-w-0 px-2 py-3 sm:px-3 sm:py-3.5">
                      <div className="space-y-0.5 leading-tight">
                        <div>
                          {r.adminDate
                            ? formatDateRuFromIso(r.adminDate)
                            : "—"}
                        </div>
                        <div className="font-mono text-[11px] text-zinc-600 sm:text-xs">
                          {r.adminTime ?? "—"}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center sm:px-3 sm:py-3.5">
                      <span
                        className={`inline-block max-w-full rounded-md px-1.5 py-0.5 text-[10px] font-medium sm:px-2 sm:text-xs ${
                          r.status === "ARCHIVED"
                            ? "bg-zinc-200 text-zinc-800"
                            : r.status === "CANCELLED"
                              ? "bg-rose-100 text-rose-950"
                              : r.status === "NEW"
                                ? "bg-amber-100 text-amber-950"
                                : "bg-sky-100 text-sky-950"
                        }`}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-2 py-3 sm:px-3 sm:py-3.5">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="whitespace-nowrap rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-emerald-700 sm:px-3 sm:py-1.5 sm:text-sm"
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
                  <option value="CANCELLED">Отменена</option>
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
