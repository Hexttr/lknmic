import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import type { SessionData } from "@/lib/session";
import { getSessionOptions } from "@/lib/session";

export default async function Home() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    getSessionOptions(),
  );
  if (session.isLoggedIn) {
    if (session.role === Role.ADMIN) redirect("/admin");
    redirect("/lk");
  }
  redirect("/login");
}
