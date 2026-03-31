import { NextRequest, NextResponse } from "next/server";
import { PriceCatalogNodeKind } from "@prisma/client";
import { getAdminSession } from "@/lib/admin-session";
import {
  refreshSearchBlobForNode,
  refreshSearchBlobsForSubtree,
  validateNodePayload,
  wouldCreateParentCycle,
} from "@/lib/price-catalog";
import { prisma } from "@/lib/prisma";

const selectFlat = {
  id: true,
  parentId: true,
  kind: true,
  title: true,
  priceText: true,
  sourceUrl: true,
  sortOrder: true,
} as const;

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const existing = await prisma.priceCatalogNode.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let kind = existing.kind;
  if ("kind" in b && b.kind !== undefined) {
    const kindStr = String(b.kind);
    if (kindStr === "GROUP") kind = PriceCatalogNodeKind.GROUP;
    else if (kindStr === "SERVICE") kind = PriceCatalogNodeKind.SERVICE;
    else {
      return NextResponse.json({ error: "kind" }, { status: 400 });
    }
  }

  let title = existing.title;
  if ("title" in b && b.title !== undefined) {
    title = String(b.title).trim();
  }

  let priceText =
    existing.priceText === null ? null : existing.priceText;
  if ("priceText" in b) {
    if (b.priceText === null || b.priceText === undefined) {
      priceText = null;
    } else {
      const p = String(b.priceText).trim();
      priceText = p || null;
    }
  }

  let sourceUrl = existing.sourceUrl;
  if ("sourceUrl" in b) {
    if (b.sourceUrl === null || b.sourceUrl === undefined) {
      sourceUrl = null;
    } else {
      const s = String(b.sourceUrl).trim().slice(0, 2000);
      sourceUrl = s || null;
    }
  }

  const v = validateNodePayload({ kind, title, priceText });
  if (!v.ok) {
    return NextResponse.json({ error: v.error }, { status: 400 });
  }

  let parentId = existing.parentId;
  let parentChanged = false;
  if ("parentId" in b) {
    const raw = b.parentId;
    const next =
      raw === null || raw === undefined
        ? null
        : String(raw).trim() || null;
    if (next !== parentId) {
      parentChanged = true;
      parentId = next;
    }
  }

  if (parentId) {
    const parent = await prisma.priceCatalogNode.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      return NextResponse.json({ error: "Родитель не найден" }, { status: 400 });
    }
    if (await wouldCreateParentCycle(prisma, id, parentId)) {
      return NextResponse.json({ error: "Нельзя перенести внутрь потомка" }, { status: 400 });
    }
  }

  let sortOrder = existing.sortOrder;
  if ("sortOrder" in b && typeof b.sortOrder === "number" && Number.isFinite(b.sortOrder)) {
    sortOrder = Math.round(b.sortOrder);
  }

  const data: {
    kind: PriceCatalogNodeKind;
    title: string;
    priceText: string | null;
    sourceUrl: string | null;
    parentId: string | null;
    sortOrder: number;
  } = {
    kind,
    title,
    priceText: kind === PriceCatalogNodeKind.SERVICE ? priceText : null,
    sourceUrl,
    parentId,
    sortOrder,
  };

  await prisma.priceCatalogNode.update({
    where: { id },
    data,
  });

  if (parentChanged) {
    await refreshSearchBlobsForSubtree(prisma, id);
  } else {
    await refreshSearchBlobForNode(prisma, id);
  }

  const node = await prisma.priceCatalogNode.findUnique({
    where: { id },
    select: selectFlat,
  });

  return NextResponse.json({ node });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

  const { id } = await params;

  const exists = await prisma.priceCatalogNode.findUnique({ where: { id } });
  if (!exists) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.priceCatalogNode.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
