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
  if (path.isAbsolute(relative)) {
    throw new Error("invalid stored path");
  }
  const normalized = path.normalize(relative);
  const abs = path.resolve(UPLOAD_DIR, normalized);
  const root = path.resolve(UPLOAD_DIR);
  const rel = path.relative(root, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("path traversal");
  }
  return abs;
}
