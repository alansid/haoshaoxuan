import { Suspense } from "react";
import { requireProfile } from "@/lib/auth";
import { ProfileFields } from "../(main)/me/ProfileFields";
import { OnboardingForm, SkipButton } from "./OnboardingForm";

export const metadata = { title: "先認識你一下" };

async function Onboarding({ searchParams }: PageProps<"/onboarding">) {
  const { next: nextParam } = await searchParams;
  const next = typeof nextParam === "string" && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";
  const { profile } = await requireProfile("/onboarding");
  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">先認識你一下 👋</h1>
          <p className="mt-1 text-sm text-muted">之後都可以在「我的」修改。</p>
        </div>
        <SkipButton next={next} />
      </div>
      <OnboardingForm next={next}>
        <ProfileFields profile={profile} showName />
      </OnboardingForm>
    </>
  );
}

export default function OnboardingPage(props: PageProps<"/onboarding">) {
  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-8">
      <Suspense fallback={<p className="text-sm text-muted">載入中…</p>}>
        <Onboarding {...props} />
      </Suspense>
    </main>
  );
}
