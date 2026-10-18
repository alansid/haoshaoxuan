import { PickForm } from "./PickForm";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">今天外食吃什麼？</h1>
        <p className="mt-1 text-sm text-muted">選場合和預算，幫你挑出比較適合減脂的組合。</p>
      </div>
      <PickForm />
    </div>
  );
}
