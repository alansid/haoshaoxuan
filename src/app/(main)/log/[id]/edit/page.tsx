import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { isoToTaipeiLocal } from "@/lib/meal-log-form";
import { getStore } from "@/lib/store";
import { deleteLogAction, updateLogAction } from "../../actions";
import { LogForm } from "../../LogForm";
import { DeleteButton } from "./DeleteButton";

async function EditLog({ params }: PageProps<"/log/[id]/edit">) {
  const { id } = await params;
  const user = await requireUser(`/log/${id}/edit`);
  const log = await (await getStore()).getLog(user.id, id);
  if (!log) notFound();

  return (
    <div className="space-y-6">
      {/* 資料更新後重新建立表單，避免輸入框留著舊的預設值 */}
      <LogForm
        key={log.updatedAt}
        action={updateLogAction.bind(null, id)}
        title="編輯紀錄"
        initial={{ ...log, eatenAtLocal: isoToTaipeiLocal(log.eatenAt) }}
      />
      <DeleteButton action={deleteLogAction.bind(null, id)} />
    </div>
  );
}

export default function EditLogPage(props: PageProps<"/log/[id]/edit">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">載入中…</p>}>
      <EditLog {...props} />
    </Suspense>
  );
}
