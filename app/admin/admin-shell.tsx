"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useState } from "react";

const nav = [
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
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(288px,88vw)] flex-col border-r border-[#0a1628] bg-[#0c2847] text-[#f0f4fa] shadow-xl transition-transform duration-200 ease-out md:static md:z-auto md:w-64 md:max-w-none md:translate-x-0 md:shadow-none ${
          menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 md:block md:px-5 md:py-8">
          <Link href="/admin/patients" className="block min-w-0" onClick={closeMenu}>
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
        <p className="hidden px-5 pb-2 text-xs font-medium uppercase tracking-wider text-white/50 md:block">
          Администрирование
        </p>
        <p className="px-4 pb-2 text-xs font-medium uppercase tracking-wider text-white/50 md:hidden">
          Меню
        </p>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
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
            onClick={() => {
              void enterPatientMode();
              closeMenu();
            }}
            className="mb-2 w-full rounded-md px-4 py-3 text-left text-sm text-white/85 hover:bg-white/10 hover:text-white"
          >
            Войти как пациент
          </button>
          <p className="mb-3 hidden px-1 text-xs leading-snug text-white/45 md:block">
            Откроется личный кабинет с вашими данными; панель администратора
            будет недоступна, пока не вернётесь из ЛК.
          </p>
          <p className="mb-3 px-1 text-xs leading-snug text-white/45 md:hidden">
            ЛК вместо панели до возврата.
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full rounded-md px-4 py-3 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white"
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
