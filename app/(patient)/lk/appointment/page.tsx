import Link from "next/link";
import { AppointmentForm } from "./appointment-form";

export default function AppointmentPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/lk"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#0c2847] hover:underline"
      >
        ← Личный кабинет
      </Link>
      <div className="mt-6">
        <AppointmentForm />
      </div>
    </div>
  );
}
