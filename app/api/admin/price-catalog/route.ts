import { NextRequest, NextResponse } from "next/server";
import { PriceCatalogNodeKind } from "@prisma/client";
import { getAdminSession } from "@/lib/admin-session";
import { refreshSearchBlobForNode, validateNodePayload } from "@/lib/price-catalog";
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

export async function GET() {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

  const nodes = await prisma.priceCatalogNode.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: selectFlat,
  });

  return NextResponse.json({ nodes });
}

export async function POST(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

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
  const parentIdRaw = b.parentId;
  const parentId =
    parentIdRaw === null || parentIdRaw === undefined
      ? null
      : String(parentIdRaw).trim() || null;

  const kindStr = String(b.kind ?? "");
  const kind =
    kindStr === "GROUP"
      ? PriceCatalogNodeKind.GROUP
      : kindStr === "SERVICE"
        ? PriceCatalogNodeKind.SERVICE
        : null;
  if (!kind) {
    return NextResponse.json({ error: "kind: GROUP или SERVICE" }, { status: 400 });
  }

  const title = String(b.title ?? "").trim();
  const priceText =
    b.priceText === null || b.priceText === undefined
      ? null
      : String(b.priceText).trim() || null;
  const sourceUrl =
    b.sourceUrl === null || b.sourceUrl === undefined
      ? null
      : String(b.sourceUrl).trim().slice(0, 2000) || null;

  const v = validateNodePayload({ kind, title, priceText });
  if (!v.ok) {
    return NextResponse.json({ error: v.error }, { status: 400 });
  }

  if (parentId) {
    const parent = await prisma.priceCatalogNode.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      return NextResponse.json({ error: "Родитель не найден" }, { status: 400 });
    }
  }

  const maxSibling = await prisma.priceCatalogNode.aggregate({
    where: { parentId },
    _max: { sortOrder: true },
  });
  const sortOrder =
    typeof b.sortOrder === "number" && Number.isFinite(b.sortOrder)
      ? Math.round(b.sortOrder)
      : (maxSibling._max.sortOrder ?? -1) + 1;

  const created = await prisma.priceCatalogNode.create({
    data: {
      parentId,
      kind,
      title,
      priceText: kind === PriceCatalogNodeKind.SERVICE ? priceText : null,
      sourceUrl,
      sortOrder,
      searchBlob: "",
    },
    select: selectFlat,
  });

  await refreshSearchBlobForNode(prisma, created.id);

  const node = await prisma.priceCatalogNode.findUnique({
    where: { id: created.id },
    select: selectFlat,
  });

  return NextResponse.json({ node });
}
