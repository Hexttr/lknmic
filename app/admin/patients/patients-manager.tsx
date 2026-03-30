"use client";

import { useCallback, useEffect, useState } from "react";
import type { ComponentProps, FormEvent } from "react";

type Doc = {
  id: string;
  originalName: string;
  size: number;
  createdAt: string;
};

type Patient = {
  id: string;
  phone: string;
  fullName: string | null;
  createdAt: string;
  documents: Doc[];
};

function formatSize(n: number): string {
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
  return `${(n / 1024 / 1024).toFixed(1)} МБ`;
}

function IconEdit(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconTrash(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

export function PatientsManager() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);

  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [editPhone, setEditPhone] = useState("");
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const closeEdit = useCallback(() => {
    setEditPatient(null);
    setEditPhone("");
    setEditName("");
  }, []);

  const load = useCallback(async () => {
    setError(null);
    const q = search.replace(/\D/g, "");
    const url = q ? `/api/admin/patients?q=${encodeURIComponent(q)}` : "/api/admin/patients";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      setError("Не удалось загрузить список");
      return;
    }
    const data = (await res.json()) as { patients: Patient[] };
    setPatients(data.patients);
  }, [search]);

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
    if (!editPatient) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEdit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editPatient, closeEdit]);

  function openEdit(p: Patient) {
    setEditPatient(p);
    setEditPhone(p.phone);
    setEditName(p.fullName ?? "");
    setError(null);
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editPatient) return;
    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/patients/${editPatient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: editPhone,
          fullName: editName,
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
      setSavingEdit(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: createPhone, fullName: createName }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Ошибка создания");
        return;
      }
      setCreatePhone("");
      setCreateName("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function deletePatient(p: Patient) {
    const label = (p.fullName?.trim() || p.phone).slice(0, 80);
    if (
      !confirm(
        `Вы точно хотите удалить карточку пациента «${label}»? Все прикреплённые файлы будут удалены безвозвратно.`,
      )
    ) {
      return;
    }
    setError(null);
    const res = await fetch(`/api/admin/patients/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Не удалось удалить карточку");
      return;
    }
    await load();
  }

  async function uploadFile(patientId: string, file: File) {
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch(`/api/admin/patients/${patientId}/files`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      setError("Не удалось загрузить файл");
      return;
    }
    await load();
  }

  async function deleteDoc(patientId: string, docId: string) {
    if (!confirm("Удалить файл?")) return;
    const res = await fetch(
      `/api/admin/patients/${patientId}/files/${docId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      setError("Не удалось удалить файл");
      return;
    }
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1a1a1a]">Пациенты</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Учётные записи по номеру телефона. Файлы видны пациенту в личном кабинете
        после первого входа.
      </p>

      <form
        onSubmit={handleCreate}
        className="mt-8 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Новый пациент
        </h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm">
            <span className="text-zinc-700">Телефон +7</span>
            <input
              type="tel"
              required
              placeholder="+7 900 000-00-00"
              value={createPhone}
              onChange={(e) => setCreatePhone(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </label>
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm">
            <span className="text-zinc-700">ФИО</span>
            <input
              type="text"
              placeholder="Иванов Иван Иванович"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </label>
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-[#ee0000] px-5 py-2 text-sm font-medium text-white hover:bg-[#cc0000] disabled:opacity-50"
          >
            {creating ? "Создание…" : "Создать"}
          </button>
        </div>
      </form>

      <div className="mt-8">
        <label className="flex max-w-md flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Поиск по номеру</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Цифры номера"
            className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-zinc-500">Загрузка…</p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {patients.map((p) => (
            <li
              key={p.id}
              className="relative rounded-lg border border-zinc-200 bg-white p-5 pt-12 shadow-sm"
            >
              <div className="absolute right-3 top-3 flex gap-1">
                <button
                  type="button"
                  title="Редактировать"
                  onClick={() => openEdit(p)}
                  className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-[#0c2847]"
                >
                  <IconEdit className="h-5 w-5" />
                  <span className="sr-only">Редактировать</span>
                </button>
                <button
                  type="button"
                  title="Удалить"
                  onClick={() => void deletePatient(p)}
                  className="rounded-md p-2 text-zinc-500 transition hover:bg-red-50 hover:text-red-600"
                >
                  <IconTrash className="h-5 w-5" />
                  <span className="sr-only">Удалить</span>
                </button>
              </div>

              <div>
                <p className="pr-2 text-lg font-semibold text-[#1a1a1a]">
                  {p.fullName?.trim() || (
                    <span className="font-normal text-zinc-400">ФИО не указано</span>
                  )}
                </p>
                <p className="mt-1 font-mono text-sm text-zinc-800">{p.phone}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  В системе с{" "}
                  {new Date(p.createdAt).toLocaleString("ru-RU", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              </div>

              <div className="mt-4 border-t border-zinc-100 pt-4">
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Файлы
                </p>
                <ul className="mt-2 space-y-2">
                  {p.documents.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <a
                        href={`/api/documents/${d.id}/download`}
                        className="text-[#0066cc] underline hover:text-[#004499]"
                      >
                        {d.originalName}
                      </a>
                      <span className="text-zinc-500">
                        ({formatSize(d.size)})
                      </span>
                      <button
                        type="button"
                        onClick={() => void deleteDoc(p.id, d.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Удалить
                      </button>
                    </li>
                  ))}
                  {p.documents.length === 0 && (
                    <li className="text-sm text-zinc-500">Файлов пока нет</li>
                  )}
                </ul>
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-[#ee0000] hover:underline">
                  <input
                    type="file"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void uploadFile(p.id, f);
                    }}
                  />
                  + Прикрепить файл
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && patients.length === 0 && (
        <p className="mt-8 text-zinc-500">Пациенты не найдены.</p>
      )}

      {editPatient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-patient-title"
          onClick={() => closeEdit()}
        >
          <div
            className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="edit-patient-title" className="text-lg font-semibold text-[#1a1a1a]">
              Редактировать пациента
            </h2>
            <form onSubmit={submitEdit} className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-700">Телефон +7</span>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-700">ФИО</span>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Необязательно"
                  className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
                />
              </label>
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-md bg-[#ee0000] px-4 py-2 text-sm font-medium text-white hover:bg-[#cc0000] disabled:opacity-50"
                >
                  {savingEdit ? "Сохранение…" : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
