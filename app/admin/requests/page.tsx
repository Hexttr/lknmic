import { Suspense } from "react";
import { RequestsManager } from "./requests-manager";

export default function AdminRequestsPage() {
  return (
    <Suspense fallback={<p className="text-zinc-500">Загрузка…</p>}>
      <RequestsManager />
    </Suspense>
  );
}
