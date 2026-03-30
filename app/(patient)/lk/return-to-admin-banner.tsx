"use client";

export function ReturnToAdminBanner() {
  async function backToAdmin() {
    const res = await fetch("/api/admin/patient-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
    if (res.ok) {
      window.location.href = "/admin/patients";
    }
  }

  return (
    <div className="w-full border-b border-amber-200/80 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">
      <span className="mr-2">Вы в режиме просмотра личного кабинета как пациент.</span>
      <button
        type="button"
        onClick={() => void backToAdmin()}
        className="font-semibold text-[#0c2847] underline decoration-[#0c2847]/40 underline-offset-2 hover:text-[#ee0000] hover:decoration-[#ee0000]"
      >
        Вернуться в панель администратора
      </button>
    </div>
  );
}
