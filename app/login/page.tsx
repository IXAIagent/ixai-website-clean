"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, login } from "../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("請輸入 email 與 password。");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await login(trimmedEmail, password);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("帳號或密碼錯誤，請重新確認。");
      } else if (err instanceof ApiError) {
        setError(err.message || "登入失敗，請稍後再試。");
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
            <h1 className="text-3xl font-semibold">AI Wealth Operating System</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--ixai-text-muted)]">
              受邀用戶可登入 Portfolio Intelligence、FCN Monitoring 與 AI Risk Alerts 工作區。
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
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
                autoComplete="current-password"
                className="w-full rounded-xl border border-[var(--ixai-border-subtle)] bg-[var(--ixai-surface-elevated)] px-4 py-3 text-white outline-none transition focus:border-[var(--ixai-accent)]"
                placeholder="請輸入密碼"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
              {loading ? "登入中..." : "進入 IXAI Pro"}
            </button>

            <div className="text-center text-sm text-[var(--ixai-text-muted)]">
              目前僅限受邀用戶使用。
              <Link
                className="ml-2 font-semibold text-[var(--ixai-risk-clear)] transition hover:text-[var(--ixai-risk-clear)]"
                href="/register"
              >
                建立測試帳號
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
