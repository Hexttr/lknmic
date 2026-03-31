import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

  const specialistId =
    request.nextUrl.searchParams.get("specialistId")?.trim() ?? "";

  const rows = await prisma.appointmentRequest.findMany({
    where: specialistId
      ? { specialistTypeId: specialistId }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { phone: true } },
      specialistType: { select: { name: true, iconKey: true } },
    },
  });

  return NextResponse.json({ appointments: rows });
}
