"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useState } from "react";

const nav = [
  { href: "/admin/overview", label: "Обзор" },
  { href: "/admin/requests", label: "Заявки" },
  { href: "/admin/patients", label: "Пациенты" },
  { href: "/admin/specialists", label: "Специалисты" },
  { href: "/admin/settings", label: "Настройки" },
];

function IconMenu(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function IconClose(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function enterPatientMode() {
    const res = await fetch("/api/admin/patient-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    if (res.ok) {
      window.location.href = "/lk";
      return;
    }
    window.alert("Не удалось переключить режим. Обновите страницу и попробуйте снова.");
  }

  return (
    <div className="flex min-h-screen bg-[#f0f0f0]">
      {menuOpen && (
        <button
          type="button"
          aria-label="Закрыть меню"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMenu}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(288px,88vw)] flex-col border-r border-[#0a1628] bg-[#0c2847] text-[#f0f4fa] shadow-xl transition-transform duration-200 ease-out md:sticky md:top-0 md:z-auto md:h-svh md:max-h-screen md:w-64 md:max-w-none md:shrink-0 md:translate-x-0 md:self-start md:overflow-hidden md:shadow-none ${
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 md:block md:px-4 md:py-4">
          <Link href="/admin/overview" className="block min-w-0" onClick={closeMenu}>
            <Image
              src="/logo.png"
              alt=""
              width={220}
              height={88}
              className="h-auto w-full max-w-[160px] object-contain brightness-0 invert md:max-w-[200px]"
              priority
            />
          </Link>
          <button
            type="button"
            className="rounded-md p-2 text-white/80 hover:bg-white/10 md:hidden"
            aria-label="Закрыть меню"
            onClick={closeMenu}
          >
            <IconClose className="h-6 w-6" />
          </button>
        </div>
        <p className="hidden px-4 pb-1 text-[10px] font-medium uppercase tracking-wider text-white/50 md:block">
          Администрирование
        </p>
        <p className="px-4 pb-1 text-[10px] font-medium uppercase tracking-wider text-white/50 md:hidden">
          Меню
        </p>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2 md:overflow-hidden md:p-2">
          {nav.map((item) => {
            const active =
              item.href === "/admin/overview"
                ? pathname === "/admin/overview" || pathname === "/admin"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className={`rounded-md px-3 py-2 text-[13px] font-medium leading-snug transition md:py-1.5 ${
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
        <div className="shrink-0 border-t border-white/10 p-2">
          <button
            type="button"
            onClick={() => {
              void enterPatientMode();
              closeMenu();
            }}
            className="mb-1 w-full rounded-md px-3 py-2 text-left text-[13px] text-white/85 hover:bg-white/10 hover:text-white"
          >
            Войти как пациент
          </button>
          <p className="mb-2 hidden px-1 text-[10px] leading-tight text-white/45 md:block">
            ЛК вместо панели до возврата.
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full rounded-md px-3 py-2 text-left text-[13px] text-white/70 hover:bg-white/10 hover:text-white"
          >
            Выход
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200/80 bg-[#f0f0f0]/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-[#f0f0f0]/90 md:hidden">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-300/80 bg-white text-zinc-800 shadow-sm active:bg-zinc-100"
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <span className="truncate text-base font-semibold text-zinc-900">
            Админ-панель
          </span>
        </header>

        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-5 md:px-6 md:py-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
