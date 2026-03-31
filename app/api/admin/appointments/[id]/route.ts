import { NextRequest, NextResponse } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

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

  const data: {
    status?: AppointmentStatus;
    adminDate?: string | null;
    adminTime?: string | null;
  } = {};

  if ("status" in body) {
    const s = String((body as { status: unknown }).status);
    if (
      s !== "NEW" &&
      s !== "AWAITING_PATIENT" &&
      s !== "ARCHIVED"
    ) {
      return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
    }
    data.status = s as AppointmentStatus;
  }

  if ("adminDate" in body) {
    const v = (body as { adminDate: unknown }).adminDate;
    if (v === null || v === "") {
      data.adminDate = null;
    } else {
      const str = String(v).trim();
      if (!DATE_RE.test(str)) {
        return NextResponse.json({ error: "Некорректная дата" }, { status: 400 });
      }
      data.adminDate = str;
    }
  }

  if ("adminTime" in body) {
    const v = (body as { adminTime: unknown }).adminTime;
    if (v === null || v === "") {
      data.adminTime = null;
    } else {
      const str = String(v).trim();
      if (!TIME_RE.test(str)) {
        return NextResponse.json({ error: "Некорректное время" }, { status: 400 });
      }
      data.adminTime = str;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  try {
    const updated = await prisma.appointmentRequest.update({
      where: { id },
      data,
      include: {
        user: { select: { phone: true } },
        specialistType: { select: { name: true, iconKey: true } },
      },
    });
    return NextResponse.json({ appointment: updated });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
