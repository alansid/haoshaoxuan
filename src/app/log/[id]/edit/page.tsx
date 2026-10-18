import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { isoToTaipeiLocal } from "@/lib/meal-log-form";
import { getStore } from "@/lib/store";
import { deleteLogAction, updateLogAction } from "../../actions";
import { LogForm } from "../../LogForm";

async function EditLog({ params }: PageProps<"/log/[id]/edit">) {
  const { id } = await params;
  const user = await requireUser(`/log/${id}/edit`);
  const log = await (await getStore()).getLog(user.id, id);
  if (!log) notFound();

  return (
    <div className="space-y-4">
      <LogForm
        action={updateLogAction.bind(null, id)}
        submitLabel="儲存修改"
        initial={{ ...log, eatenAtLocal: isoToTaipeiLocal(log.eatenAt) }}
      />
      <form action={deleteLogAction.bind(null, id)}>
        <button type="submit" className="text-sm text-red-600 underline">
          刪除這筆紀錄
        </button>
      </form>
    </div>
  );
}

export default function EditLogPage(props: PageProps<"/log/[id]/edit">) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">修改紀錄</h1>
      <Suspense fallback={<p className="text-sm text-muted">載入中…</p>}>
        <EditLog {...props} />
      </Suspense>
    </div>
  );
}
