import type { Prisma, PrismaClient } from "@prisma/client";
import { PriceCatalogNodeKind } from "@prisma/client";

export async function getAncestorTitles(
  prisma: PrismaClient,
  nodeId: string,
): Promise<string[]> {
  const titles: string[] = [];
  let currentId: string | null = nodeId;

  while (currentId) {
    const row: { parentId: string | null; title: string } | null =
      await prisma.priceCatalogNode.findUnique({
        where: { id: currentId },
        select: { parentId: true, title: true },
      });
    if (!row) break;
    titles.unshift(row.title);
    currentId = row.parentId;
  }

  return titles;
}

export function buildSearchBlob(
  pathTitles: string[],
  priceText: string | null,
): string {
  const parts = [...pathTitles];
  const tail = (priceText ?? "").trim();
  if (tail) parts.push(tail);
  return parts.join(" ").replace(/\s+/g, " ").trim().toLowerCase();
}

export async function refreshSearchBlobForNode(
  prisma: PrismaClient,
  nodeId: string,
): Promise<void> {
  const node = await prisma.priceCatalogNode.findUnique({
    where: { id: nodeId },
    select: { title: true, priceText: true },
  });
  if (!node) return;

  const path = await getAncestorTitles(prisma, nodeId);
  const searchBlob = buildSearchBlob(path, node.priceText);

  await prisma.priceCatalogNode.update({
    where: { id: nodeId },
    data: { searchBlob },
  });
}

/** Все потомки (BFS), не включая rootId */
export async function collectDescendantIds(
  prisma: PrismaClient,
  rootId: string,
): Promise<string[]> {
  const out: string[] = [];
  const queue = [rootId];

  while (queue.length > 0) {
    const id = queue.shift()!;
    const kids = await prisma.priceCatalogNode.findMany({
      where: { parentId: id },
      select: { id: true },
    });
    for (const k of kids) {
      out.push(k.id);
      queue.push(k.id);
    }
  }

  return out;
}

export async function refreshSearchBlobsForSubtree(
  prisma: PrismaClient,
  rootId: string,
): Promise<void> {
  const ids = [rootId, ...(await collectDescendantIds(prisma, rootId))];
  for (const id of ids) {
    await refreshSearchBlobForNode(prisma, id);
  }
}

/** Перенос parentId на nodeId создаст цикл? */
export async function wouldCreateParentCycle(
  prisma: PrismaClient,
  nodeId: string,
  newParentId: string | null,
): Promise<boolean> {
  if (newParentId === null) return false;
  if (newParentId === nodeId) return true;

  let walk: string | null = newParentId;
  const seen = new Set<string>();

  while (walk) {
    if (walk === nodeId) return true;
    if (seen.has(walk)) break;
    seen.add(walk);
    const row: { parentId: string | null } | null =
      await prisma.priceCatalogNode.findUnique({
        where: { id: walk },
        select: { parentId: true },
      });
    walk = row?.parentId ?? null;
  }

  return false;
}

export function validateNodePayload(data: {
  kind: PriceCatalogNodeKind;
  title: string;
  priceText: string | null | undefined;
}): { ok: true } | { ok: false; error: string } {
  const title = data.title.trim();
  if (!title || title.length > 2000) {
    return { ok: false, error: "Укажите название (до 2000 символов)" };
  }

  const price = (data.priceText ?? "").trim();
  if (data.kind === PriceCatalogNodeKind.SERVICE && !price) {
    return { ok: false, error: "Для услуги укажите цену" };
  }

  if (price.length > 500) {
    return { ok: false, error: "Цена слишком длинная" };
  }

  return { ok: true };
}

export type PriceCatalogFlatRow = Prisma.PriceCatalogNodeGetPayload<{
  select: {
    id: true;
    parentId: true;
    kind: true;
    title: true;
    priceText: true;
    sourceUrl: true;
    sortOrder: true;
  };
}>;
