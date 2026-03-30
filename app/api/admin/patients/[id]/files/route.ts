import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import {
  absoluteUploadPath,
  documentStoragePath,
  ensureUploadDir,
} from "@/lib/uploads";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

  const { id: userId } = await params;

  const user = await prisma.user.findFirst({
    where: { id: userId, role: Role.PATIENT },
  });
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  const originalName = (file as File).name || "file";
  const size = file.size;
  if (size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }

  await ensureUploadDir();
  const docId = crypto.randomUUID();
  const relative = documentStoragePath(userId, docId, originalName);
  const abs = absoluteUploadPath(relative);
  await mkdir(path.dirname(abs), { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(abs, buf);

  const doc = await prisma.patientDocument.create({
    data: {
      id: docId,
      userId,
      originalName,
      storedPath: relative,
      mimeType: (file as File).type || null,
      size,
      uploadedById: admin.userId,
    },
    select: {
      id: true,
      originalName: true,
      size: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ document: doc });
}
