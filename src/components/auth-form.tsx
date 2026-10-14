"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHydrated } from "./use-hydrated";
import { createAuthClient } from "better-auth/react";
const client = createAuthClient();
export function LoginForm({ demo }: { demo: boolean }) {
  const router = useRouter();
  const ready = useHydrated();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      method="post"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        try {
          const r = await client.signIn.email({
            email: String(f.get("email")),
            password: String(f.get("password")),
          });
          if (r.error) throw new Error("이메일과 비밀번호를 확인해주세요.");
          router.push("/account");
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "로그인 실패");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        이메일
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={demo ? "standard@demo.local" : ""}
        />
      </label>
      <label>
        비밀번호
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          defaultValue={demo ? "DemoOnly!2026" : ""}
        />
      </label>
      <button className="btn primary full" disabled={busy || !ready}>
        {busy ? "로그인 중..." : "로그인"}
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </form>
  );
}
export function Logout() {
  const router = useRouter();
  return (
    <button
      className="link-button"
      onClick={async () => {
        await client.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      로그아웃
    </button>
  );
}
