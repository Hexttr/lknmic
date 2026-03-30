import { unlink } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAdminSession } from "@/lib/admin-session";
import { normalizePhoneRu } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { absoluteUploadPath } from "@/lib/uploads";

type Params = { params: Promise<{ id: string }> };

const patientInclude = {
  documents: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      originalName: true,
      size: true,
      createdAt: true,
    },
  },
};

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

  const existing = await prisma.user.findFirst({
    where: { id, role: Role.PATIENT },
  });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const data: { fullName?: string | null; phone?: string } = {};

  if ("fullName" in body) {
    data.fullName = String((body as { fullName: unknown }).fullName).trim() || null;
  }
  if ("phone" in body) {
    const phone = normalizePhoneRu(String((body as { phone: unknown }).phone));
    if (!phone) {
      return NextResponse.json(
        { error: "Некорректный номер телефона" },
        { status: 400 },
      );
    }
    if (phone !== existing.phone) {
      const taken = await prisma.user.findUnique({ where: { phone } });
      if (taken) {
        return NextResponse.json(
          { error: "Номер уже занят другим пользователем" },
          { status: 409 },
        );
      }
    }
    data.phone = phone;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    include: patientInclude,
  });

  return NextResponse.json({ patient: user });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

  const { id } = await params;

  const user = await prisma.user.findFirst({
    where: { id, role: Role.PATIENT },
    include: { documents: true },
  });
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  for (const doc of user.documents) {
    try {
      await unlink(absoluteUploadPath(doc.storedPath));
    } catch {
      // файл уже отсутствует
    }
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
