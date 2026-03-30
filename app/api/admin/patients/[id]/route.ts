import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAdminSession } from "@/lib/admin-session";
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

  const fullName =
    typeof body === "object" && body !== null && "fullName" in body
      ? String((body as { fullName: unknown }).fullName).trim()
      : "";

  const existing = await prisma.user.findFirst({
    where: { id, role: Role.PATIENT },
  });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { fullName: fullName || null },
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
