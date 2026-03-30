import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionData } from "@/lib/session";
import { getSessionOptions } from "@/lib/session";

export async function finalizeLoginForPhone(phone: string) {
  const user = await prisma.user.upsert({
    where: { phone },
    create: { phone, verifiedAt: new Date(), role: Role.PATIENT },
    update: { verifiedAt: new Date() },
  });

  const session = await getIronSession<SessionData>(
    await cookies(),
    getSessionOptions(),
  );
  session.userId = user.id;
  session.isLoggedIn = true;
  await session.save();

  return user;
}
