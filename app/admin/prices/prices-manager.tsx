"use client";

import { FolderTree, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

type Kind = "GROUP" | "SERVICE";

type Row = {
  id: string;
  parentId: string | null;
  kind: Kind;
  title: string;
  priceText: string | null;
  sourceUrl: string | null;
  sortOrder: number;
};

function buildChildrenMap(rows: Row[]): Map<string | null, Row[]> {
  const byParent = new Map<string | null, Row[]>();
  for (const n of rows) {
    const k = n.parentId;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push(n);
  }
  for (const arr of byParent.values()) {
    arr.sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "ru"),
    );
  }
  return byParent;
}

export function PricesManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const byParent = useMemo(() => buildChildrenMap(rows), [rows]);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/price-catalog", { cache: "no-store" });
    if (!res.ok) {
      setError("Не удалось загрузить каталог");
      return;
    }
    const data = (await res.json()) as { nodes: Row[] };
    setRows(data.nodes);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const toggle = (id: string) => {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  };

  const groupOptions = useMemo(() => {
    return rows
      .filter((r) => r.kind === "GROUP")
      .map((r) => ({ id: r.id, label: r.title }));
  }, [rows]);

  return (
    <div>
      <div className="flex items-center gap-3">
        <FolderTree className="h-8 w-8 shrink-0 text-[#0c2847]" aria-hidden />
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">
          Услуги и цены
        </h1>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Категории и строки прайса для личного кабинета пациента. Импорт с сайта
        НЦЗД — скриптом из репозитория.
      </p>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <CreateBlock
        parentId={null}
        parentLabel="Корень"
        groupOptions={groupOptions}
        onCreated={load}
        setError={setError}
      />

      {loading ? (
        <p className="mt-8 text-zinc-500">Загрузка…</p>
      ) : (
        <ul className="mt-6 space-y-0 border-t border-zinc-200">
          <TreeLevel
            parentId={null}
            depth={0}
            byParent={byParent}
            expanded={expanded}
            onToggle={toggle}
            onChanged={load}
            setError={setError}
            groupOptions={groupOptions}
          />
        </ul>
      )}

      {!loading && rows.length === 0 && (
        <p className="mt-6 text-zinc-500">
          Каталог пуст. Добавьте разделы вручную или выполните импорт.
        </p>
      )}
    </div>
  );
}

function TreeLevel({
  parentId,
  depth,
  byParent,
  expanded,
  onToggle,
  onChanged,
  setError,
  groupOptions,
}: {
  parentId: string | null;
  depth: number;
  byParent: Map<string | null, Row[]>;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onChanged: () => Promise<void>;
  setError: (s: string | null) => void;
  groupOptions: { id: string; label: string }[];
}) {
  const list = byParent.get(parentId) ?? [];
  return (
    <>
      {list.map((node) => (
        <li key={node.id} className="list-none">
          <div
            className="flex flex-wrap items-start gap-2 border-b border-zinc-100 py-2 pl-1"
            style={{ paddingLeft: `${8 + depth * 16}px` }}
          >
            {node.kind === "GROUP" ? (
              <button
                type="button"
                onClick={() => onToggle(node.id)}
                className="mt-0.5 shrink-0 rounded border border-zinc-300 px-1.5 py-0 text-xs text-zinc-600 hover:bg-zinc-50"
                aria-expanded={expanded[node.id] === true}
              >
                {expanded[node.id] === true ? "−" : "+"}
              </button>
            ) : (
              <span className="mt-0.5 w-6 shrink-0" aria-hidden />
            )}
            <span className="mt-0.5 shrink-0 text-zinc-400">
              {node.kind === "GROUP" ? (
                <FolderTree className="h-4 w-4" aria-hidden />
              ) : (
                <Tag className="h-4 w-4" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-900">{node.title}</p>
              {node.kind === "SERVICE" && node.priceText && (
                <p className="text-sm text-emerald-800">{node.priceText}</p>
              )}
              <p className="text-[11px] text-zinc-400">
                {node.kind === "GROUP" ? "Раздел" : "Услуга"} · порядок{" "}
                {node.sortOrder}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {node.kind === "GROUP" && (
                <CreateInlineButton
                  parentId={node.id}
                  groupOptions={groupOptions}
                  onCreated={onChanged}
                  setError={setError}
                />
              )}
              <EditButton
                node={node}
                groupOptions={groupOptions}
                onSaved={onChanged}
                setError={setError}
              />
              <button
                type="button"
                onClick={() => void removeNode(node, onChanged, setError)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Удалить
              </button>
            </div>
          </div>
          {node.kind === "GROUP" && expanded[node.id] === true && (
            <ul className="list-none">
              <TreeLevel
                parentId={node.id}
                depth={depth + 1}
                byParent={byParent}
                expanded={expanded}
                onToggle={onToggle}
                onChanged={onChanged}
                setError={setError}
                groupOptions={groupOptions}
              />
            </ul>
          )}
        </li>
      ))}
    </>
  );
}

async function removeNode(
  node: Row,
  onChanged: () => Promise<void>,
  setError: (s: string | null) => void,
) {
  const msg =
    node.kind === "GROUP"
      ? `Удалить раздел «${node.title}» и всё внутри?`
      : `Удалить услугу «${node.title}»?`;
  if (!confirm(msg)) return;
  setError(null);
  const res = await fetch(`/api/admin/price-catalog/${node.id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    setError("Не удалось удалить");
    return;
  }
  await onChanged();
}

function CreateInlineButton({
  parentId,
  groupOptions,
  onCreated,
  setError,
}: {
  parentId: string;
  groupOptions: { id: string; label: string }[];
  onCreated: () => Promise<void>;
  setError: (s: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#0c2847] hover:bg-zinc-100"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Добавить
      </button>
    );
  }
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2">
      <CreateBlock
        parentId={parentId}
        parentLabel="в этот раздел"
        groupOptions={groupOptions}
        onCreated={async () => {
          await onCreated();
          setOpen(false);
        }}
        setError={setError}
        onCancel={() => setOpen(false)}
        compact
      />
    </div>
  );
}

function CreateBlock({
  parentId,
  parentLabel,
  groupOptions,
  onCreated,
  setError,
  onCancel,
  compact,
}: {
  parentId: string | null;
  parentLabel: string;
  groupOptions: { id: string; label: string }[];
  onCreated: () => Promise<void>;
  setError: (s: string | null) => void;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const [kind, setKind] = useState<Kind>("GROUP");
  const [title, setTitle] = useState("");
  const [priceText, setPriceText] = useState("");
  const [parentSelect, setParentSelect] = useState<string>(parentId ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setParentSelect(parentId ?? "");
  }, [parentId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const pid =
        parentSelect === "" ? null : parentSelect;
      const res = await fetch("/api/admin/price-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId: pid,
          kind,
          title,
          priceText: kind === "SERVICE" ? priceText : null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Ошибка");
        return;
      }
      setTitle("");
      setPriceText("");
      await onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className={
        compact
          ? "flex flex-col gap-2"
          : "mt-8 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      }
    >
      {!compact && (
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Добавить ({parentLabel})
        </h2>
      )}
      <div className="mt-1 flex flex-col gap-3">
        {!compact && (
          <label className="flex max-w-md flex-col gap-1 text-sm">
            <span className="text-zinc-700">Родитель</span>
            <select
              value={parentSelect}
              onChange={(e) => setParentSelect(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
            >
              <option value="">Корень</option>
              {groupOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex max-w-md flex-col gap-1 text-sm">
          <span className="text-zinc-700">Тип</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
          >
            <option value="GROUP">Раздел</option>
            <option value="SERVICE">Услуга с ценой</option>
          </select>
        </label>
        <label className="flex max-w-md flex-col gap-1 text-sm">
          <span className="text-zinc-700">Название</span>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
          />
        </label>
        {kind === "SERVICE" && (
          <label className="flex max-w-md flex-col gap-1 text-sm">
            <span className="text-zinc-700">Цена</span>
            <input
              type="text"
              required
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              placeholder="напр. 1 500 ₽"
              className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[#ee0000] px-4 py-2 text-sm font-medium text-white hover:bg-[#cc0000] disabled:opacity-50"
          >
            {saving ? "Сохранение…" : "Добавить"}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
            >
              Отмена
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function EditButton({
  node,
  groupOptions,
  onSaved,
  setError,
}: {
  node: Row;
  groupOptions: { id: string; label: string }[];
  onSaved: () => Promise<void>;
  setError: (s: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#0c2847] hover:bg-zinc-100"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        Изменить
      </button>
    );
  }
  return (
    <EditModal
      node={node}
      groupOptions={groupOptions}
      onClose={() => setOpen(false)}
      onSaved={onSaved}
      setError={setError}
    />
  );
}

function EditModal({
  node,
  groupOptions,
  onClose,
  onSaved,
  setError,
}: {
  node: Row;
  groupOptions: { id: string; label: string }[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  setError: (s: string | null) => void;
}) {
  const [kind, setKind] = useState<Kind>(node.kind);
  const [title, setTitle] = useState(node.title);
  const [priceText, setPriceText] = useState(node.priceText ?? "");
  const [parentSelect, setParentSelect] = useState(node.parentId ?? "");
  const [sortOrder, setSortOrder] = useState(String(node.sortOrder));
  const [saving, setSaving] = useState(false);

  const parentChoices = groupOptions.filter((g) => g.id !== node.id);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const pid = parentSelect === "" ? null : parentSelect;
      const res = await fetch(`/api/admin/price-catalog/${node.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId: pid,
          kind,
          title,
          priceText: kind === "SERVICE" ? priceText : null,
          sortOrder: Number(sortOrder),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Ошибка");
        return;
      }
      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-zinc-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[#1a1a1a]">Редактировать</h2>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">Родитель</span>
            <select
              value={parentSelect}
              onChange={(e) => setParentSelect(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
            >
              <option value="">Корень</option>
              {parentChoices.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">Тип</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
            >
              <option value="GROUP">Раздел</option>
              <option value="SERVICE">Услуга</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">Название</span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </label>
          {kind === "SERVICE" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-700">Цена</span>
              <input
                type="text"
                required
                value={priceText}
                onChange={(e) => setPriceText(e.target.value)}
                className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">Порядок (sortOrder)</span>
            <input
              type="number"
              required
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
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
  );
}
