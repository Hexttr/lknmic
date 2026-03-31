import { NextRequest, NextResponse } from "next/server";
import { getLkSession } from "@/lib/lk-session";
import { prisma } from "@/lib/prisma";

const selectPublic = {
  id: true,
  parentId: true,
  kind: true,
  title: true,
  priceText: true,
  sortOrder: true,
  /// Денормализованный путь+текст для быстрого поиска на клиенте
  searchBlob: true,
} as const;

export async function GET(request: NextRequest) {
  const lk = await getLkSession();
  if (!lk.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: lk.status });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (!q) {
    const nodes = await prisma.priceCatalogNode.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: selectPublic,
    });
    return NextResponse.json({ nodes });
  }

  const nodes = await prisma.priceCatalogNode.findMany({
    where: { searchBlob: { contains: q } },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: selectPublic,
  });

  return NextResponse.json({ nodes, query: q });
}
