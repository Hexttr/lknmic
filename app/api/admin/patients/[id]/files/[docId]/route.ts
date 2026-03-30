import { unlink } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { absoluteUploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

  const { id: userId, docId } = await params;

  const doc = await prisma.patientDocument.findFirst({
    where: { id: docId, userId },
  });
  if (!doc) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    await unlink(absoluteUploadPath(doc.storedPath));
  } catch {
    // missing file or invalid path — still delete DB row below
  }

  await prisma.patientDocument.delete({ where: { id: docId } });

  return NextResponse.json({ ok: true });
}
