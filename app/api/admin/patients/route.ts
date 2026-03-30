import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { normalizePhoneRu } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const digits = q.replace(/\D/g, "");

  const patients = await prisma.user.findMany({
    where: {
      role: Role.PATIENT,
      ...(digits.length > 0
        ? { phone: { contains: digits } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          originalName: true,
          size: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json({ patients });
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
      fullName: fullName || null,
      role: Role.PATIENT,
    },
    update: {
      ...(fullName ? { fullName } : {}),
    },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          originalName: true,
          size: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json({ patient: user });
}
