"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/admin/patients", label: "Пациенты" },
  { href: "/admin/settings", label: "Настройки" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen bg-[#f0f0f0]">
      <aside className="flex w-64 shrink-0 flex-col border-r border-black/20 bg-[#1a1a1a] text-[#f5f5f5]">
        <div className="border-b border-white/10 px-5 py-8">
          <Link href="/admin/patients" className="block">
            <Image
              src="/logo.png"
              alt=""
              width={220}
              height={88}
              className="h-auto w-full max-w-[200px] object-contain brightness-0 invert"
              priority
            />
          </Link>
          <p className="mt-4 text-xs font-medium uppercase tracking-wider text-white/50">
            Администрирование
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-[#ee0000] text-white shadow-inner"
                    : "text-white/85 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full rounded-md px-4 py-3 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            Выход
          </button>
        </div>
      </aside>
      <div className="min-h-screen flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </div>
    </div>
  );
}
