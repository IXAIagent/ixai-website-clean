"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, login } from "../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@ixai.local");
  const [password, setPassword] = useState("demo");
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
    <main className="min-h-screen bg-black px-5 py-10 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-emerald-500/10 sm:p-8">
          <div className="mb-8">
            <div className="mb-3 text-sm font-semibold uppercase text-emerald-400">
              IXAI Agent
            </div>
            <h1 className="text-3xl font-bold">登入一玄AI Dashboard</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Demo 帳號：demo@ixai.local / demo
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-300">
                Email
              </span>
              <input
                autoComplete="email"
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                placeholder="demo@ixai.local"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-300">
                Password
              </span>
              <input
                autoComplete="current-password"
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                placeholder="demo"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {error && (
              <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
                {error}
              </div>
            )}

            <button
              className="w-full rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? "登入中..." : "登入 Dashboard"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
