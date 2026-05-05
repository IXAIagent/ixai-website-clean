"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, apiFetch } from "../lib/api";

type LoginResponse = {
  access_token?: string;
  token_type?: string;
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("請輸入 email 與 password。");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await apiFetch<LoginResponse>("/api/v1/auth/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
        }),
      });

      if (!data?.access_token) {
        setError("登入成功但後端未回傳 access token，請檢查 API。");
        return;
      }

      window.localStorage.setItem("ixai_token", data.access_token);
      window.localStorage.removeItem("token");
      router.replace("/");
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
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-950 p-8 shadow-2xl shadow-blue-500/10">
          <div className="mb-8">
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">
              IXAI AGENT
            </div>
            <h1 className="text-3xl font-bold">登入投資監控系統</h1>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              使用你的帳號載入個人 Portfolio、Dashboard 與資產管理資料。
            </p>
          </div>

          <form className="space-y-5" onSubmit={login}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-300">
                Email
              </span>
              <input
                autoComplete="email"
                className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-white outline-none transition focus:border-white"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-300">
                Password
              </span>
              <input
                autoComplete="current-password"
                className="w-full rounded-xl border border-gray-700 bg-black px-4 py-3 text-white outline-none transition focus:border-white"
                placeholder="請輸入密碼"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error && (
              <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
                {error}
              </div>
            )}

            <button
              className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? "登入中..." : "登入"}
            </button>

            <Link
              className="block w-full rounded-xl border border-gray-700 px-5 py-3 text-center font-semibold text-white transition hover:bg-white hover:text-black"
              href="/"
            >
              回 Dashboard
            </Link>
          </form>
        </div>
      </section>
    </main>
  );
}
