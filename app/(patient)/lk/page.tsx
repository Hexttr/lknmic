import { Role } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionData } from "@/lib/session";
import { getSessionOptions } from "@/lib/session";
import { LogoutButton } from "./logout-button";
import { ReturnToAdminBanner } from "./return-to-admin-banner";

function formatSize(n: number): string {
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
  return `${(n / 1024 / 1024).toFixed(1)} МБ`;
}

export default async function LkPage() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    getSessionOptions(),
  );
  if (!session.isLoggedIn || !session.userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!user) redirect("/login");

  const showAdminBanner =
    session.role === Role.ADMIN && session.patientMode === true;

  return (
    <>
      {showAdminBanner && <ReturnToAdminBanner />}
      <div className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-10">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="НМИЦ здоровья детей"
            width={180}
            height={72}
            className="h-auto w-auto max-w-[220px] object-contain"
            priority
          />
        </div>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-8">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-500">Личный кабинет</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            Добро пожаловать
          </h1>
          <p className="mt-3 font-mono text-sm text-zinc-600">{user.phone}</p>
        </div>
        <LogoutButton />
      </header>

      <div className="flex justify-center">
        <Link
          href="/lk/appointment"
          className="inline-flex w-full max-w-md items-center justify-center rounded-xl bg-[#ee0000] px-6 py-4 text-center text-base font-semibold text-white shadow-sm transition hover:bg-[#cc0000] sm:w-auto"
        >
          Запись на приём
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">
          Документы для вас
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Файлы, которые администратор прикрепил к вашей учётной записи.
        </p>

        {user.documents.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
            <p className="text-sm text-zinc-600">
              Пока нет прикреплённых файлов. Когда появятся новые документы, они
              отобразятся в этом списке.
            </p>
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {user.documents.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-900">
                    {d.originalName}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatSize(d.size)} ·{" "}
                    {new Date(d.createdAt).toLocaleString("ru-RU", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <a
                  href={`/api/documents/${d.id}/download`}
                  className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                  Скачать
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </>
  );
}
