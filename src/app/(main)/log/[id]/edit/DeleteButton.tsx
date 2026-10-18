"use client";

export function DeleteButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("確定要刪除這筆紀錄嗎？")) e.preventDefault();
      }}
      className="text-center"
    >
      <button type="submit" className="text-sm text-coral underline">
        刪除這筆
      </button>
    </form>
  );
}
