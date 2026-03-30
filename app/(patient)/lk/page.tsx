import { prisma } from "@/lib/prisma";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionData } from "@/lib/session";
import { getSessionOptions } from "@/lib/session";
import { LogoutButton } from "./logout-button";

export default async function LkPage() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    getSessionOptions(),
  );
  if (!session.isLoggedIn || !session.userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Личный кабинет
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Вы вошли как {user.phone}
          </p>
        </div>
        <LogoutButton />
      </header>
      <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-6">
        <p className="text-zinc-700">
          Здесь позже появятся записи, документы и другие данные. Разделы
          настроим отдельно.
        </p>
      </section>
    </div>
  );
}
