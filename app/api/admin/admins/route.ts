import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAdminSession } from "@/lib/admin-session";
import { normalizePhoneRu } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      phone: true,
      fullName: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ admins });
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

  const phoneRaw =
    typeof body === "object" && body !== null && "phone" in body
      ? String((body as { phone: unknown }).phone)
      : "";
  const fullName =
    typeof body === "object" && body !== null && "fullName" in body
      ? String((body as { fullName: unknown }).fullName).trim()
      : "";

  const phone = normalizePhoneRu(phoneRaw);
  if (!phone) {
    return NextResponse.json(
      { error: "Некорректный номер телефона" },
      { status: 400 },
    );
  }

  const user = await prisma.user.upsert({
    where: { phone },
    create: {
      phone,
      role: Role.ADMIN,
      fullName: fullName || null,
    },
    update: {
      role: Role.ADMIN,
      ...(fullName ? { fullName } : {}),
    },
    select: {
      id: true,
      phone: true,
      fullName: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ admin: user });
}
