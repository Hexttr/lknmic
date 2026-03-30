"use client";

import { useCallback, useEffect, useState } from "react";

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

export function PatientsManager() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);

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

  async function handleCreate(e: React.FormEvent) {
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

  async function saveName(patientId: string, fullName: string) {
    await fetch(`/api/admin/patients/${patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName }),
    });
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
        <ul className="mt-6 flex flex-col gap-4">
          {patients.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <PatientNameEditor
                    key={`${p.id}-${p.fullName ?? ""}`}
                    initialName={p.fullName ?? ""}
                    onSave={(name) => void saveName(p.id, name)}
                  />
                  <p className="mt-1 font-mono text-sm text-zinc-800">{p.phone}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    В системе с{" "}
                    {new Date(p.createdAt).toLocaleString("ru-RU", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
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
    </div>
  );
}

function PatientNameEditor({
  initialName,
  onSave,
}: {
  initialName: string;
  onSave: (name: string) => void;
}) {
  const [value, setValue] = useState(initialName);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          className="min-w-[200px] rounded border border-zinc-300 px-2 py-1 text-lg font-medium text-zinc-900"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            setEditing(false);
            void onSave(value.trim());
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="text-left text-lg font-semibold text-[#1a1a1a] hover:text-[#ee0000]"
      onClick={() => setEditing(true)}
    >
      {value.trim() || "ФИО не указано — нажмите, чтобы ввести"}
    </button>
  );
}
