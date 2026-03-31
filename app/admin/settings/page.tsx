import { Suspense } from "react";
import { SettingsManager } from "./settings-manager";

export default function AdminSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-zinc-500">Загрузка настроек…</div>
      }
    >
      <SettingsManager />
    </Suspense>
  );
}
