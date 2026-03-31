import { exec } from "node:child_process";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: admin.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const b =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const dryRun = Boolean(b.dryRun);
  const clear = Boolean(b.clear);
  const maxSections =
    typeof b.maxSections === "number" &&
    Number.isFinite(b.maxSections) &&
    b.maxSections > 0
      ? Math.min(500, Math.floor(b.maxSections))
      : undefined;

  if (clear && dryRun) {
    return NextResponse.json(
      { error: "Нельзя одновременно очистить каталог и dry-run" },
      { status: 400 },
    );
  }

  const parts = ["npm run import:prices --"];
  if (dryRun) parts.push("--dry-run");
  if (clear) parts.push("--clear");
  if (maxSections != null) parts.push(`--max-sections=${maxSections}`);

  const cmd = parts.join(" ");

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: process.cwd(),
      maxBuffer: 40 * 1024 * 1024,
      timeout: 900_000,
      env: { ...process.env },
    });
    return NextResponse.json({ ok: true, stdout, stderr });
  } catch (e) {
    const err = e as Error & { stdout?: string; stderr?: string };
    return NextResponse.json(
      {
        ok: false,
        error: err.message ?? "import_failed",
        stdout: err.stdout,
        stderr: err.stderr,
      },
      { status: 500 },
    );
  }
}
