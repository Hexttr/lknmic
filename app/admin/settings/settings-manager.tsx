"use client";

import { Bot, Download, Shield, Settings } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

type AdminRow = {
  id: string;
  phone: string;
  fullName: string | null;
  createdAt: string;
};

type AnthropicKeySource = "env" | "database" | "none";

type SettingsTab = "admins" | "ai" | "import";

export function SettingsManager() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFromUrl = useMemo((): SettingsTab => {
    const t = searchParams.get("tab");
    if (t === "ai") return "ai";
    if (t === "import") return "import";
    return "admins";
  }, [searchParams]);

  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const [anthropicSource, setAnthropicSource] =
    useState<AnthropicKeySource | null>(null);
  const [anthropicKeyInput, setAnthropicKeyInput] = useState("");
  const [anthropicSaving, setAnthropicSaving] = useState(false);
  const [anthropicMsg, setAnthropicMsg] = useState<string | null>(null);

  const [importRunning, setImportRunning] = useState(false);
  const [importLog, setImportLog] = useState<string | null>(null);

  const setTab = useCallback(
    (next: SettingsTab) => {
      const q = new URLSearchParams(searchParams.toString());
      if (next === "admins") {
        q.delete("tab");
      } else {
        q.set("tab", next);
      }
      const qs = q.toString();
      router.push(qs ? `/admin/settings?${qs}` : "/admin/settings", {
        scroll: false,
      });
    },
    [router, searchParams],
  );

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

  const loadAppSettings = useCallback(async () => {
    const res = await fetch("/api/admin/app-settings", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      anthropicKeySource?: AnthropicKeySource;
    };
    if (data.anthropicKeySource) {
      setAnthropicSource(data.anthropicKeySource);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await load();
      await loadAppSettings();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load, loadAppSettings]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось добавить");
        return;
      }
      setPhone("");
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

  async function saveAnthropicKey(e: FormEvent) {
    e.preventDefault();
    setAnthropicSaving(true);
    setAnthropicMsg(null);
    try {
      const res = await fetch("/api/admin/app-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anthropicApiKey: anthropicKeyInput }),
      });
      const data = (await res.json()) as {
        error?: string;
        anthropicKeySource?: AnthropicKeySource;
      };
      if (!res.ok) {
        setAnthropicMsg(data.error ?? "Не удалось сохранить");
        return;
      }
      setAnthropicKeyInput("");
      if (data.anthropicKeySource) {
        setAnthropicSource(data.anthropicKeySource);
      }
      setAnthropicMsg("Сохранено.");
    } finally {
      setAnthropicSaving(false);
    }
  }

  async function runPriceImport(opts: {
    dryRun: boolean;
    clear?: boolean;
    maxSections?: number;
  }) {
    if (!opts.dryRun && opts.clear) {
      if (
        !confirm(
          "Очистить каталог и выполнить импорт? Это удалит все узлы в «Услуги и цены».",
        )
      ) {
        return;
      }
    } else if (!opts.dryRun && opts.maxSections == null) {
      if (
        !confirm(
          "Полный импорт с nczd.ru займёт много времени и сделает сотни запросов. Продолжить?",
        )
      ) {
        return;
      }
    }

    setImportRunning(true);
    setImportLog(null);
    try {
      const res = await fetch("/api/admin/import-price-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        stdout?: string;
        stderr?: string;
        error?: string;
      };
      const lines =
        (data.stdout ?? "") +
        (data.stderr ? `\n--- stderr ---\n${data.stderr}` : "") +
        (data.error ? `\n${data.error}` : "");
      setImportLog(lines.trim() || JSON.stringify(data, null, 2));
    } finally {
      setImportRunning(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 shrink-0 text-[#0c2847]" aria-hidden />
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">Настройки</h1>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
        Администраторы, ключи API и импорт прайса.
      </p>

      <nav
        className="mt-8 flex flex-wrap gap-1 border-b border-zinc-200"
        aria-label="Разделы настроек"
      >
        <button
          type="button"
          onClick={() => setTab("admins")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-lg transition ${
            tabFromUrl === "admins"
              ? "border-[#ee0000] font-semibold text-zinc-900"
              : "border-transparent font-medium text-zinc-900 hover:bg-zinc-50"
          }`}
        >
          <Shield className="h-5 w-5 shrink-0 text-zinc-900" aria-hidden />
          Администраторы
        </button>
        <button
          type="button"
          onClick={() => setTab("ai")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-lg transition ${
            tabFromUrl === "ai"
              ? "border-[#ee0000] font-semibold text-zinc-900"
              : "border-transparent font-medium text-zinc-900 hover:bg-zinc-50"
          }`}
        >
          <Bot className="h-5 w-5 shrink-0 text-zinc-900" aria-hidden />
          AI
        </button>
        <button
          type="button"
          onClick={() => setTab("import")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-lg transition ${
            tabFromUrl === "import"
              ? "border-[#ee0000] font-semibold text-zinc-900"
              : "border-transparent font-medium text-zinc-900 hover:bg-zinc-50"
          }`}
        >
          <Download className="h-5 w-5 shrink-0 text-zinc-900" aria-hidden />
          Импорт
        </button>
      </nav>

      {tabFromUrl === "admins" && (
        <section className="mt-8 max-w-[560px]">
          <h2 className="text-base font-semibold text-zinc-900">
            Администраторы
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Номер должен совпадать с тем, по которому человек входит в систему
            (звонок SMS.ru).
          </p>

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
                  </div>
                  <button
                    type="button"
                    disabled={admins.length <= 1}
                    title={
                      admins.length <= 1
                        ? "Должен остаться хотя бы один администратор"
                        : undefined
                    }
                    onClick={() => void removeAdmin(a.id, a.phone)}
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
            <h3 className="text-sm font-semibold text-zinc-900">
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
      )}

      {tabFromUrl === "ai" && (
        <section className="mt-8 max-w-[640px]">
            <h2 className="text-base font-semibold text-zinc-900">
              ИИ-подбор услуг (Anthropic)
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Ключ для чата «Подбор услуги» в личном кабинете пациента. Если
              задан параметр окружения{" "}
              <span className="font-mono text-xs">ANTHROPIC_API_KEY</span>, он
              имеет приоритет; иначе используется ключ из поля ниже.
            </p>

            {anthropicSource === "env" && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Сейчас используется ключ из переменной окружения{" "}
                <span className="font-mono">ANTHROPIC_API_KEY</span>. Сохранение
                в форме недоступно, пока переменная задана.
              </p>
            )}

            {anthropicSource === "database" && (
              <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                Ключ сохранён в базе данных. Введите новый ключ, чтобы
                заменить, или очистите поле и нажмите «Сохранить», чтобы
                удалить.
              </p>
            )}

            {anthropicSource === "none" && (
              <p className="mt-3 text-sm text-zinc-600">
                Ключ не задан — подбор по ИИ в ЛК пациента будет недоступен,
                пока вы не укажете ключ здесь или в окружении.
              </p>
            )}

            {anthropicMsg && (
              <p className="mt-3 text-sm text-zinc-700" role="status">
                {anthropicMsg}
              </p>
            )}

            <form
              onSubmit={saveAnthropicKey}
              className="mt-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-700">
                  API-ключ Anthropic{" "}
                  <span className="font-normal text-zinc-500">
                    (скрыто после сохранения)
                  </span>
                </span>
                <input
                  type="password"
                  name="anthropic-api-key"
                  autoComplete="off"
                  value={anthropicKeyInput}
                  onChange={(e) => setAnthropicKeyInput(e.target.value)}
                  placeholder="sk-ant-api03-…"
                  disabled={anthropicSource === "env"}
                  className="rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm text-zinc-900 disabled:bg-zinc-100"
                />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={anthropicSaving || anthropicSource === "env"}
                  className="rounded-md bg-[#0c2847] px-5 py-2 text-sm font-medium text-white hover:bg-[#0a1f38] disabled:opacity-50"
                >
                  {anthropicSaving ? "Сохранение…" : "Сохранить ключ"}
                </button>
              </div>
            </form>
        </section>
      )}

      {tabFromUrl === "import" && (
        <section className="mt-8 max-w-[640px]">
          <h2 className="text-base font-semibold text-zinc-900">
            Импорт прайса с nczd.ru
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Загрузка дерева разделов и таблиц цен с сайта. На локальной машине
            выполняется через тот же скрипт, что и в терминале:{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-xs">
              npm run import:prices
            </code>
            . Кнопки ниже запускают импорт на сервере разработки (может занять
            несколько минут при полном импорте).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={importRunning}
              onClick={() =>
                void runPriceImport({ dryRun: true, maxSections: 3 })
              }
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
            >
              {importRunning ? "Выполняется…" : "Тест: dry-run, 3 раздела"}
            </button>
            <button
              type="button"
              disabled={importRunning}
              onClick={() =>
                void runPriceImport({ dryRun: false, maxSections: 3 })
              }
              className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-50"
            >
              Импорт в БД (3 раздела)
            </button>
            <button
              type="button"
              disabled={importRunning}
              onClick={() => void runPriceImport({ dryRun: false })}
              className="rounded-md bg-[#ee0000] px-4 py-2 text-sm font-medium text-white hover:bg-[#cc0000] disabled:opacity-50"
            >
              Полный импорт
            </button>
            <button
              type="button"
              disabled={importRunning}
              onClick={() =>
                void runPriceImport({ dryRun: false, clear: true })
              }
              className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
            >
              Очистить и полный импорт
            </button>
          </div>
          {importLog && (
            <pre className="mt-4 max-h-80 overflow-auto rounded-lg border border-zinc-200 bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100">
              {importLog}
            </pre>
          )}
        </section>
      )}
    </div>
  );
}
