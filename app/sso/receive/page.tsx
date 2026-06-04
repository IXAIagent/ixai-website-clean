"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearLegacySsoSession, setProSsoSession } from "../../lib/sso-session";

type ReceiveState =
  | { status: "checking" }
  | {
      emailMasked: string | null;
      status: "valid";
      userIdTail: string | null;
    }
  | {
      message: string;
      status: "failed";
    };

type LaunchValidationResponse = {
  identity?: {
    emailMasked?: string | null;
    userIdTail?: string | null;
  };
  message?: string;
  ok: boolean;
  status: string;
};

const DEFAULT_APP_URL = "https://app.ixuan.ai";

function getAppBaseUrl() {
  return (process.env.NEXT_PUBLIC_IXAI_APP_URL || DEFAULT_APP_URL).replace(/\/$/, "");
}

function getLaunchCode() {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("code")?.trim() || null;
}

export default function SsoReceivePage() {
  const appBaseUrl = useMemo(() => getAppBaseUrl(), []);
  const router = useRouter();
  const [state, setState] = useState<ReceiveState>({ status: "checking" });

  useEffect(() => {
    let mounted = true;

    async function validateLaunchCode() {
      const code = getLaunchCode();

      if (!code) {
        clearLegacySsoSession();
        setState({
          message: "缺少 IXAI Pro 連線代碼。",
          status: "failed",
        });
        return;
      }

      try {
        const response = await fetch(
          `${appBaseUrl}/api/pro/launch?code=${encodeURIComponent(code)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as LaunchValidationResponse;

        if (!mounted) {
          return;
        }

        if (!response.ok || !payload.ok) {
          clearLegacySsoSession();
          setState({
            message:
              payload.message ||
              "連線已逾時，請重新從 App 開啟 IXAI Pro 或使用 Pro 登入頁。",
            status: "failed",
          });
          return;
        }

        setState({
          emailMasked: payload.identity?.emailMasked ?? null,
          status: "valid",
          userIdTail: payload.identity?.userIdTail ?? null,
        });
        setProSsoSession({
          appUserIdTail: payload.identity?.userIdTail ?? null,
          maskedEmail: payload.identity?.emailMasked ?? null,
        });
        window.setTimeout(() => {
          router.replace("/dashboard");
        }, 850);
      } catch {
        clearLegacySsoSession();
        if (mounted) {
          setState({
            message: "暫時無法驗證 App 帳號身份，請使用 Pro 登入頁。",
            status: "failed",
          });
        }
      }
    }

    void validateLaunchCode();

    return () => {
      mounted = false;
    };
  }, [appBaseUrl, router]);

  return (
    <main className="min-h-screen bg-[#061a14] px-5 py-10 text-[#f5f0e6]">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="w-full max-w-2xl rounded-2xl border border-[rgba(176,141,87,0.26)] bg-black/35 p-6 shadow-2xl shadow-black/30 sm:p-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ixai-gold)]">
            IXAI Pro SSO Prototype
          </p>

          {state.status === "checking" ? (
            <>
              <h1 className="mt-3 text-3xl font-semibold">正在連接 IXAI Pro</h1>
              <p className="mt-4 text-sm leading-7 text-[var(--ixai-text-muted)]">
                正在驗證 App 傳來的短效身份代碼。這個步驟不會讀取你的 App 密碼，也不會儲存 Supabase token。
              </p>
            </>
          ) : null}

          {state.status === "valid" ? (
            <>
              <h1 className="mt-3 text-3xl font-semibold">
                已接收 App 帳號身份，正在準備進入 IXAI Pro。
              </h1>
              <p className="mt-4 text-sm leading-7 text-[var(--ixai-text-muted)]">
                已建立短效 IXAI Pro 測試 session，系統會自動帶你進入 Pro Dashboard。這不等於付費 Pro 權限，也不會儲存 Supabase token。
              </p>
              <div className="mt-5 rounded-xl border border-[rgba(176,141,87,0.28)] bg-[rgba(176,141,87,0.10)] px-4 py-3 text-sm leading-6 text-[var(--ixai-text-muted)]">
                <p>
                  App 帳號：
                  <span className="font-semibold text-[var(--ixai-text-strong)]">
                    {state.emailMasked || "已驗證"}
                  </span>
                </p>
                <p>
                  User ID：
                  <span className="font-mono text-[var(--ixai-text-strong)]">
                    {state.userIdTail ? `...${state.userIdTail}` : "已接收"}
                  </span>
                </p>
              </div>
            </>
          ) : null}

          {state.status === "failed" ? (
            <>
              <h1 className="mt-3 text-3xl font-semibold">IXAI Pro 連線未完成</h1>
              <p className="mt-4 text-sm leading-7 text-[var(--ixai-text-muted)]">
                {state.message}
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--ixai-text-muted)]">
                連線已逾時，請重新從 App 開啟 IXAI Pro 或使用 Pro 登入頁。
              </p>
            </>
          ) : null}

          <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
            {state.status === "valid" ? (
              <a
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--ixai-accent)] px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
                href="/dashboard"
              >
                繼續前往 Pro Dashboard
              </a>
            ) : null}
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[rgba(176,141,87,0.36)] bg-[rgba(255,255,255,0.06)] px-5 py-3 text-sm font-semibold text-[var(--ixai-text-strong)] transition hover:border-[var(--ixai-accent)]"
              href="/login"
            >
              使用 Pro 登入頁
            </a>
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[rgba(176,141,87,0.22)] px-5 py-3 text-sm font-semibold text-[var(--ixai-risk-clear)] transition hover:text-[var(--ixai-accent)]"
              href={`${appBaseUrl}/account`}
              rel="noreferrer"
            >
              回到 IXAI App
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
