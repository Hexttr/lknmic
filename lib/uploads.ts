import fs from "node:fs/promises";
import path from "node:path";

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export function documentStoragePath(userId: string, docId: string, originalName: string): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._\-А-Яа-яЁё]/gu, "_").slice(0, 120);
  return path.join(userId, `${docId}-${safe}`);
}

export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export function absoluteUploadPath(relative: string): string {
  return path.join(UPLOAD_DIR, relative);
}
