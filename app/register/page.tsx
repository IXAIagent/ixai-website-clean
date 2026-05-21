"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, register } from "../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("請輸入 email 與 password。");
      return;
    }

    if (password !== confirmPassword) {
      setError("兩次輸入的密碼不一致。");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await register(trimmedEmail, password);
      router.replace("/login");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "註冊失敗，請稍後再試。");
      } else {
        setError("無法連線後端 API，請確認 FastAPI 是否啟動。");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#061a14] px-5 py-10 text-[#f5f0e6]">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-[rgba(176,141,87,0.24)] bg-black/35 p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="mb-8">
            <div className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ixai-gold)]">
              IXAI Pro
            </div>
            <h1 className="text-3xl font-bold">建立測試帳號</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--ixai-text-muted)]">
              目前僅限受邀測試用戶使用。註冊後將自動建立你的 Portfolio。
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleRegister}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ixai-text-strong)]">
                Email
              </span>
              <input
                autoComplete="email"
                className="w-full rounded-xl border border-[var(--ixai-border-subtle)] bg-[var(--ixai-surface-elevated)] px-4 py-3 text-white outline-none transition focus:border-[var(--ixai-accent)]"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ixai-text-strong)]">
                Password
              </span>
              <input
                autoComplete="new-password"
                className="w-full rounded-xl border border-[var(--ixai-border-subtle)] bg-[var(--ixai-surface-elevated)] px-4 py-3 text-white outline-none transition focus:border-[var(--ixai-accent)]"
                placeholder="請輸入密碼"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ixai-text-strong)]">
                Confirm Password
              </span>
              <input
                autoComplete="new-password"
                className="w-full rounded-xl border border-[var(--ixai-border-subtle)] bg-[var(--ixai-surface-elevated)] px-4 py-3 text-white outline-none transition focus:border-[var(--ixai-accent)]"
                placeholder="再次輸入密碼"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>

            {error && (
              <div className="rounded-xl border border-[var(--ixai-risk-critical)]/50 bg-[rgba(210,122,122,0.10)] px-4 py-3 text-sm leading-6 text-[var(--ixai-risk-critical)]">
                {error}
              </div>
            )}

            <button
              className="w-full rounded-xl bg-[var(--ixai-accent)] px-5 py-3 font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? "建立中..." : "建立帳號"}
            </button>

            <Link
              className="block w-full rounded-xl border border-[var(--ixai-border-subtle)] px-5 py-3 text-center font-semibold text-[var(--ixai-text-strong)] transition hover:bg-[var(--ixai-surface-card)]"
              href="/login"
            >
              返回登入
            </Link>
          </form>
        </div>
      </section>
    </main>
  );
}
