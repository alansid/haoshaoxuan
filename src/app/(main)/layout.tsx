import { Suspense } from "react";
import { isDevMode } from "@/lib/config";
import { TabBar } from "./TabBar";

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {isDevMode() && (
        <p className="bg-sun-soft px-4 py-1.5 text-center text-xs">測試模式：尚未連接資料庫，資料可能不會保存</p>
      )}
      <main className="mx-auto w-full max-w-md px-4 pt-5 pb-28">{children}</main>
      <Suspense fallback={<TabBar pathname={null} />}>
        <TabBar />
      </Suspense>
    </>
  );
}
