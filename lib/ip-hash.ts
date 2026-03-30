import { createHash } from "node:crypto";

export function hashIp(ip: string | null, secret: string): string | null {
  if (!ip) return null;
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex");
}
