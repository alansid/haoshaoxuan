"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { parseMealLogForm } from "@/lib/meal-log-form";
import { getStore } from "@/lib/store";

export type ActionState = { error: string } | null;

async function userOrLogin(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function createLogAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await userOrLogin("/log/new");
  const parsed = parseMealLogForm(form);
  if (!parsed.ok) return { error: parsed.error };
  await (await getStore()).createLog(user.id, parsed.value);
  revalidatePath("/log");
  redirect("/log");
}

export async function updateLogAction(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await userOrLogin(`/log/${id}/edit`);
  const parsed = parseMealLogForm(form);
  if (!parsed.ok) return { error: parsed.error };
  const updated = await (await getStore()).updateLog(user.id, id, parsed.value);
  if (!updated) return { error: "找不到這筆紀錄，可能已經被刪除" };
  revalidatePath("/log");
  redirect("/log");
}

export async function deleteLogAction(id: string): Promise<void> {
  const user = await userOrLogin("/log");
  await (await getStore()).deleteLog(user.id, id);
  revalidatePath("/log");
  redirect("/log");
}
