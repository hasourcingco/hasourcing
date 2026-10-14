"use client";
import { useState } from "react";
import { useHydrated } from "./use-hydrated";
import { useRouter } from "next/navigation";
export function ActionForm({
  children,
  op,
  className = "",
  confirmMessage,
}: {
  children: React.ReactNode;
  op: string;
  className?: string;
  confirmMessage?: string;
}) {
  const ready = useHydrated();
  const [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [success, setSuccess] = useState(false);
  const router = useRouter();
  return (
    <form
      method="post"
      className={className}
      onSubmit={async (e) => {
        e.preventDefault();
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        const f = new FormData(e.currentTarget);
        f.set("op", op);
        setError("");
        setSuccess(false);
        setPending(true);
        try {
          const r = await fetch("/api/actions", { method: "POST", body: f });
          const b = await r.json();
          if (!r.ok) throw new Error(b.error);
          if (b.redirect) router.push(b.redirect);
          else {
            setSuccess(true);
            router.refresh();
          }
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "요청을 처리하지 못했습니다.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <input type="hidden" name="op" value={op} />
      <fieldset disabled={pending || !ready}>{children}</fieldset>
      {pending && <p role="status">저장 중...</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="success" role="status">
          저장했습니다.
        </p>
      )}
    </form>
  );
}
