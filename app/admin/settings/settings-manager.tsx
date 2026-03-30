"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type AdminRow = {
  id: string;
  phone: string;
  fullName: string | null;
  createdAt: string;
};

export function SettingsManager() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/admins", { cache: "no-store" });
    if (!res.ok) {
      setError("Не удалось загрузить список администраторов");
      return;
    }
    const data = (await res.json()) as { admins: AdminRow[] };
    setAdmins(data.admins);
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

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, fullName }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось добавить");
        return;
      }
      setPhone("");
      setFullName("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function removeAdmin(id: string, label: string) {
    if (
      !confirm(
        `Снять права администратора с «${label}»? Пользователь останется в системе как пациент.`,
      )
    ) {
      return;
    }
    setError(null);
    const res = await fetch(`/api/admin/admins/${id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string; demotedSelf?: boolean };
    if (!res.ok) {
      setError(data.error ?? "Не удалось снять роль");
      return;
    }
    if (data.demotedSelf) {
      window.location.href = "/lk";
      return;
    }
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#1a1a1a]">Настройки</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
        Администраторы видят раздел «Пациенты» и настройки клиники. Номер
        должен совпадать с тем, по которому человек входит в систему (звонок
        SMS.ru).
      </p>

      <section className="mt-10 max-w-[560px]">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Администраторы
        </h2>

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-4 text-zinc-500">Загрузка…</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {admins.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm"
              >
                <div>
                  <p className="font-mono text-zinc-900">{a.phone}</p>
                  {a.fullName?.trim() && (
                    <p className="mt-0.5 text-zinc-600">{a.fullName.trim()}</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={admins.length <= 1}
                  title={
                    admins.length <= 1
                      ? "Должен остаться хотя бы один администратор"
                      : undefined
                  }
                  onClick={() =>
                    void removeAdmin(a.id, a.fullName?.trim() || a.phone)
                  }
                  className="shrink-0 text-xs font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
                >
                  Снять роль
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={handleAdd}
          className="mt-8 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <h3 className="text-sm font-semibold text-zinc-800">
            Назначить администратора
          </h3>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm">
              <span className="text-zinc-700">Телефон +7</span>
              <input
                type="tel"
                required
                placeholder="+7 900 000-00-00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
              />
            </label>
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm">
              <span className="text-zinc-700">ФИО (необязательно)</span>
              <input
                type="text"
                placeholder="Для подписи в списке"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[#ee0000] px-5 py-2 text-sm font-medium text-white hover:bg-[#cc0000] disabled:opacity-50"
            >
              {saving ? "Сохранение…" : "Назначить"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
