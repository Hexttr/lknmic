"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Stethoscope } from "lucide-react";
import {
  SPECIALIST_ICON_KEYS,
  SPECIALIST_ICON_LABELS,
  SPECIALIST_ICON_MAP,
  SpecialistIcon,
  isValidSpecialistIconKey,
  type SpecialistIconKey,
} from "@/lib/specialist-icons";

type Row = {
  id: string;
  name: string;
  iconKey: string;
  sortOrder: number;
};

export function SpecialistsManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createIcon, setCreateIcon] = useState<SpecialistIconKey>("stethoscope");
  const [creating, setCreating] = useState(false);

  const [editRow, setEditRow] = useState<Row | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState<SpecialistIconKey>("stethoscope");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/specialist-types", { cache: "no-store" });
    if (!res.ok) {
      setError("Не удалось загрузить список");
      return;
    }
    const data = (await res.json()) as { specialistTypes: Row[] };
    setRows(data.specialistTypes);
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

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/specialist-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName, iconKey: createIcon }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Ошибка");
        return;
      }
      setCreateName("");
      setCreateIcon("stethoscope");
      await load();
    } finally {
      setCreating(false);
    }
  }

  function openEdit(r: Row) {
    setEditRow(r);
    setEditName(r.name);
    setEditIcon(
      isValidSpecialistIconKey(r.iconKey) ? r.iconKey : "stethoscope",
    );
    setError(null);
  }

  function closeEdit() {
    setEditRow(null);
  }

  async function submitEdit(ev: FormEvent) {
    ev.preventDefault();
    if (!editRow) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/specialist-types/${editRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, iconKey: editIcon }),
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

  async function removeRow(id: string, name: string) {
    if (!confirm(`Удалить «${name}»? Связанные заявки на приём будут удалены.`)) {
      return;
    }
    setError(null);
    const res = await fetch(`/api/admin/specialist-types/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("Не удалось удалить");
      return;
    }
    await load();
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Stethoscope className="h-8 w-8 shrink-0 text-[#0c2847]" aria-hidden />
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">Специалисты</h1>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Справочник для записи на приём в личном кабинете пациента. Выберите
        иконку из коллекции — она отображается при выборе специалиста.
      </p>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <form
        onSubmit={handleCreate}
        className="mt-8 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Добавить тип
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          <label className="flex max-w-md flex-col gap-1 text-sm">
            <span className="text-zinc-700">Наименование</span>
            <input
              type="text"
              required
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </label>
          <div>
            <p className="text-sm font-medium text-zinc-700">Иконка</p>
            <IconPicker
              value={createIcon}
              onChange={setCreateIcon}
              className="mt-2"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="w-fit rounded-md bg-[#ee0000] px-5 py-2 text-sm font-medium text-white hover:bg-[#cc0000] disabled:opacity-50"
          >
            {creating ? "Добавление…" : "Добавить"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="mt-8 text-zinc-500">Загрузка…</p>
      ) : (
        <ul className="mt-8 space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0c2847]/10 text-[#0c2847]">
                  <SpecialistIcon iconKey={r.iconKey} className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-zinc-900">{r.name}</p>
                  <p className="text-xs text-zinc-500">Порядок: {r.sortOrder}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  className="text-sm font-medium text-[#0c2847] hover:underline"
                >
                  Изменить
                </button>
                <button
                  type="button"
                  onClick={() => void removeRow(r.id, r.name)}
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && rows.length === 0 && (
        <p className="mt-8 text-zinc-500">Список пуст. Добавьте тип или выполните seed.</p>
      )}

      {editRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => closeEdit()}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-zinc-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[#1a1a1a]">
              Редактировать
            </h2>
            <form onSubmit={submitEdit} className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-700">Наименование</span>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
                />
              </label>
              <div>
                <p className="text-sm font-medium text-zinc-700">Иконка</p>
                <IconPicker
                  value={editIcon}
                  onChange={setEditIcon}
                  className="mt-2"
                />
              </div>
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

function IconPicker({
  value,
  onChange,
  className,
}: {
  value: SpecialistIconKey;
  onChange: (k: SpecialistIconKey) => void;
  className?: string;
}) {
  return (
    <div
      className={`grid max-h-64 grid-cols-4 gap-2 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-2 sm:grid-cols-6 ${className ?? ""}`}
    >
      {SPECIALIST_ICON_KEYS.map((key) => {
        const active = value === key;
        const Cmp = SPECIALIST_ICON_MAP[key];
        const label = SPECIALIST_ICON_LABELS[key];
        return (
          <button
            key={key}
            type="button"
            title={label}
            onClick={() => onChange(key)}
            className={`flex flex-col items-center gap-1 rounded-md p-2 text-xs transition ${
              active
                ? "bg-[#0c2847] text-white ring-2 ring-[#ee0000]"
                : "bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <Cmp className="h-5 w-5 shrink-0" />
            <span className="line-clamp-2 text-[10px] leading-tight">{key}</span>
          </button>
        );
      })}
    </div>
  );
}
