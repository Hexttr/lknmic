import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PricesCatalogView } from "./prices-catalog-view";
import { PriceAssistantPanel } from "./price-assistant-panel";

export default function LkPricesPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
      <header>
        <Link
          href="/lk"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#0c2847] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          В личный кабинет
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">
          Услуги и цены
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Справочник стоимости услуг. Используйте поиск по названию или разделу.
        </p>
      </header>

      <PricesCatalogView />

      <section className="border-t border-zinc-200 pt-8">
        <h2 className="text-lg font-semibold text-zinc-900">
          Подбор услуги
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Опишите, что вас беспокоит — подсказка составлена только из прайса и
          не заменяет консультацию врача.
        </p>
        <div className="mt-4">
          <PriceAssistantPanel />
        </div>
      </section>
    </div>
  );
}
