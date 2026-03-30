import { prisma } from "@/lib/prisma";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionData } from "@/lib/session";
import { getSessionOptions } from "@/lib/session";
import { LogoutButton } from "./logout-button";

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

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Личный кабинет
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {user.fullName ? (
              <>
                <span className="font-medium text-zinc-800">
                  {user.fullName}
                </span>
                <span className="text-zinc-500"> · </span>
              </>
            ) : null}
            {user.phone}
          </p>
        </div>
        <LogoutButton />
      </header>

      <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Документы
        </h2>
        {user.documents.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">
            Пока нет прикреплённых файлов. Когда врач или администратор добавит
            документы, они появятся здесь.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {user.documents.map((d) => (
              <li key={d.id}>
                <a
                  href={`/api/documents/${d.id}/download`}
                  className="text-[#0066cc] underline hover:text-[#004499]"
                >
                  {d.originalName}
                </a>
                <span className="ml-2 text-sm text-zinc-500">
                  {formatSize(d.size)} ·{" "}
                  {new Date(d.createdAt).toLocaleDateString("ru-RU")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
