import { readFile, stat } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionData } from "@/lib/session";
import { getSessionOptions } from "@/lib/session";
import { absoluteUploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id: docId } = await params;

  const session = await getIronSession<SessionData>(
    await cookies(),
    getSessionOptions(),
  );
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const doc = await prisma.patientDocument.findUnique({
    where: { id: docId },
    include: { user: true },
  });
  if (!doc) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const isAdmin = session.role === Role.ADMIN;
  const isOwner = doc.userId === session.userId;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let abs: string;
  try {
    abs = absoluteUploadPath(doc.storedPath);
  } catch {
    return NextResponse.json({ error: "invalid_path" }, { status: 404 });
  }
  try {
    await stat(abs);
  } catch {
    return NextResponse.json({ error: "file_missing" }, { status: 404 });
  }

  const buf = await readFile(abs);
  const encoded = encodeURIComponent(doc.originalName);

  return new NextResponse(buf, {
    headers: {
      "Content-Type": doc.mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
    },
  });
}
