"use client";

import { FolderTree, Search, Tag } from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

type Kind = "GROUP" | "SERVICE";

type Node = {
  id: string;
  parentId: string | null;
  kind: Kind;
  title: string;
  priceText: string | null;
  sortOrder: number;
  searchBlob: string;
};

/** Максимум строк в режиме поиска (остальные — через уточнение запроса). */
const MAX_SEARCH_ROWS = 500;

/**
 * Извлекает число рублей для сортировки (диапазон «a — b» → максимум).
 * Без распознаванной суммы — null (в конце списка при сортировке «дороже → дешевле»).
 */
function parsePriceRubles(priceText: string | null): number | null {
  if (!priceText?.trim()) return null;
  const raw = priceText.replace(/\u00a0/g, " ");
  const segments = raw.split(/[—\-–]+/);
  let best: number | null = null;
  for (const seg of segments) {
    const digits = seg.replace(/\s/g, "").replace(/[^\d]/g, "");
    if (digits.length === 0) continue;
    const n = parseInt(digits, 10);
    if (!Number.isNaN(n) && (best === null || n > best)) best = n;
  }
  return best;
}

function sortSearchByPriceDesc(a: Node, b: Node): number {
  const pa = parsePriceRubles(a.priceText);
  const pb = parsePriceRubles(b.priceText);
  if (pa !== null && pb !== null && pa !== pb) return pb - pa;
  if (pa !== null && pb === null) return -1;
  if (pa === null && pb !== null) return 1;
  return (
    a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "ru")
  );
}

function buildChildrenMap(nodes: Node[]): Map<string | null, Node[]> {
  const byParent = new Map<string | null, Node[]>();
  for (const n of nodes) {
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

function pathLabels(
  id: string,
  byId: Map<string, Node>,
): string[] {
  const parts: string[] = [];
  let cur: Node | undefined = byId.get(id);
  const guard = new Set<string>();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    parts.unshift(cur.title);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return parts;
}

function SearchResultsList({
  nodes,
  filteredIds,
  byId,
  totalMatches,
}: {
  nodes: Node[];
  filteredIds: Set<string> | null;
  byId: Map<string, Node>;
  totalMatches: number;
}) {
  if (!filteredIds) return null;
  const sorted = nodes
    .filter((n) => filteredIds.has(n.id))
    .sort(sortSearchByPriceDesc);
  const capped = sorted.slice(0, MAX_SEARCH_ROWS);
  const overflow = sorted.length - capped.length;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <p className="border-b border-zinc-100 px-4 py-2 text-xs text-zinc-500">
        Найдено совпадений: {totalMatches}
        {totalMatches > 0 ? " · сначала дороже, затем дешевле" : ""}
        {overflow > 0
          ? ` · показаны первые ${MAX_SEARCH_ROWS} — уточните запрос`
          : ""}
      </p>
      <ul className="divide-y divide-zinc-100">
        {capped.map((n) => (
          <li key={n.id} className="px-4 py-3">
            <p className="text-xs text-zinc-500">
              {pathLabels(n.id, byId).join(" → ")}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-zinc-900">{n.title}</span>
              {n.kind === "SERVICE" && n.priceText && (
                <span className="text-emerald-800">{n.priceText}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PricesCatalogView() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const deferredQuery = useDeferredValue(query);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/patient/price-catalog", { cache: "no-store" });
    if (!res.ok) {
      setError("Не удалось загрузить прайс");
      return;
    }
    const data = (await res.json()) as { nodes: Node[] };
    setNodes(
      data.nodes.map((n) => ({
        ...n,
        searchBlob: n.searchBlob ?? "",
      })),
    );
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

  const byId = useMemo(() => {
    const m = new Map<string, Node>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const byParent = useMemo(() => buildChildrenMap(nodes), [nodes]);

  const q = deferredQuery.trim().toLowerCase();

  const filteredIds = useMemo(() => {
    if (!q) return null;
    const ids = new Set<string>();
    for (const n of nodes) {
      if (n.searchBlob.includes(q)) ids.add(n.id);
    }
    return ids;
  }, [nodes, q]);

  const toggle = (id: string) => {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  };

  if (loading) {
    return <p className="text-center text-zinc-500">Загрузка прайса…</p>;
  }

  if (error) {
    return (
      <p className="text-center text-red-600" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="sr-only">Поиск по прайсу</span>
        <span className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-3 shadow-sm focus-within:border-[#0c2847] focus-within:ring-2 focus-within:ring-[#0c2847]/20">
          <Search className="h-5 w-5 shrink-0 text-zinc-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Начните вводить название услуги или раздела…"
            className="min-w-0 flex-1 border-0 bg-transparent text-zinc-900 outline-none placeholder:text-zinc-400"
            autoComplete="off"
          />
        </span>
        {query.trim() !== deferredQuery.trim() && query.trim() !== "" && (
          <span className="text-xs text-zinc-500" aria-live="polite">
            Уточняем поиск…
          </span>
        )}
      </label>

      {nodes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
          Прайс пока не заполнен. Загляните позже.
        </p>
      ) : q ? (
        <SearchResultsList
          nodes={nodes}
          filteredIds={filteredIds}
          byId={byId}
          totalMatches={filteredIds?.size ?? 0}
        />
      ) : (
        <ul className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <TreeLevel
            parentId={null}
            depth={0}
            byParent={byParent}
            byId={byId}
            expanded={expanded}
            onToggle={toggle}
          />
        </ul>
      )}
    </div>
  );
}

function TreeLevel({
  parentId,
  depth,
  byParent,
  byId,
  expanded,
  onToggle,
}: {
  parentId: string | null;
  depth: number;
  byParent: Map<string | null, Node[]>;
  byId: Map<string, Node>;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const list = byParent.get(parentId) ?? [];
  return (
    <>
      {list.map((node) => (
        <li key={node.id} className="list-none">
          <div
            className="flex flex-wrap items-start gap-2 border-b border-zinc-100 py-3 pl-2 pr-3"
            style={{ paddingLeft: `${12 + depth * 14}px` }}
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
            <span className="mt-0.5 shrink-0 text-[#0c2847]">
              {node.kind === "GROUP" ? (
                <FolderTree className="h-4 w-4" aria-hidden />
              ) : (
                <Tag className="h-4 w-4" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-900">{node.title}</p>
              {node.kind === "SERVICE" && node.priceText && (
                <p className="mt-0.5 text-sm text-emerald-800">{node.priceText}</p>
              )}
            </div>
          </div>
          {node.kind === "GROUP" && expanded[node.id] === true && (
            <ul className="list-none">
              <TreeLevel
                parentId={node.id}
                depth={depth + 1}
                byParent={byParent}
                byId={byId}
                expanded={expanded}
                onToggle={onToggle}
              />
            </ul>
          )}
        </li>
      ))}
    </>
  );
}
