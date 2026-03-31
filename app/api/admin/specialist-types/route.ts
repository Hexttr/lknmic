import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { isValidSpecialistIconKey } from "@/lib/specialist-icons";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

  const types = await prisma.specialistType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ specialistTypes: types });
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

  const name = String((body as { name?: unknown }).name ?? "").trim();
  const iconKey = String((body as { iconKey?: unknown }).iconKey ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Укажите наименование" }, { status: 400 });
  }
  if (!iconKey || !isValidSpecialistIconKey(iconKey)) {
    return NextResponse.json({ error: "Выберите иконку из списка" }, { status: 400 });
  }

  const maxOrder = await prisma.specialistType.aggregate({
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const created = await prisma.specialistType.create({
    data: { name, iconKey, sortOrder },
  });

  return NextResponse.json({ specialistType: created });
}
