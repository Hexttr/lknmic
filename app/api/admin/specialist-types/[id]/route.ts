import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { isValidSpecialistIconKey } from "@/lib/specialist-icons";
import { prisma } from "@/lib/prisma";

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

  const data: { name?: string; iconKey?: string; sortOrder?: number } = {};

  if ("name" in body) {
    const name = String((body as { name: unknown }).name).trim();
    if (!name) {
      return NextResponse.json({ error: "Пустое наименование" }, { status: 400 });
    }
    data.name = name;
  }
  if ("iconKey" in body) {
    const iconKey = String((body as { iconKey: unknown }).iconKey).trim();
    if (!iconKey || !isValidSpecialistIconKey(iconKey)) {
      return NextResponse.json({ error: "Некорректная иконка" }, { status: 400 });
    }
    data.iconKey = iconKey;
  }
  if ("sortOrder" in body) {
    const n = Number((body as { sortOrder: unknown }).sortOrder);
    if (!Number.isFinite(n)) {
      return NextResponse.json({ error: "sortOrder" }, { status: 400 });
    }
    data.sortOrder = Math.round(n);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  try {
    const updated = await prisma.specialistType.update({
      where: { id },
      data,
    });
    return NextResponse.json({ specialistType: updated });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

  const { id } = await params;

  const exists = await prisma.specialistType.findUnique({ where: { id } });
  if (!exists) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.appointmentRequest.deleteMany({ where: { specialistTypeId: id } });
  await prisma.specialistType.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
