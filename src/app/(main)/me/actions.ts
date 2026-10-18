"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { taipeiDay, weekStart } from "@/lib/dates";
import { parseProfileForm } from "@/lib/profile";
import { weeklyChallenge } from "@/lib/stats";
import { getStore } from "@/lib/store";

export type ProfileState = { error?: string; saved?: boolean };

export async function saveProfileAction(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const { user, profile } = await requireProfile("/me");
  const parsed = parseProfileForm(form, profile);
  if (!parsed.ok) return { error: parsed.error };
  await (await getStore()).saveProfile(user.id, parsed.value);
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function finishOnboardingAction(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const { user, profile } = await requireProfile("/onboarding");
  const parsed = form.get("skip") ? ({ ok: true, value: profile } as const) : parseProfileForm(form, profile);
  if (!parsed.ok) return { error: parsed.error };
  await (await getStore()).saveProfile(user.id, { ...parsed.value, onboarded: true });
  revalidatePath("/", "layout");
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

/** 接受下週小挑戰：挑戰內容由伺服器依紀錄重算，不信任前端送來的文字 */
export async function acceptChallengeAction(): Promise<void> {
  const { user, profile } = await requireProfile("/log");
  const store = await getStore();
  const text = weeklyChallenge(await store.listLogs(user.id), profile.dailyBudget);
  await store.saveProfile(user.id, { ...profile, challenge: { week: weekStart(taipeiDay()), text } });
  revalidatePath("/log");
}
