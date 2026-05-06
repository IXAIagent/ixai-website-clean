"use client";

const LOCAL_API_BASE = "http://localhost:8000";

function resolveApiBase() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") ||
    LOCAL_API_BASE
  );
}

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") ||
  LOCAL_API_BASE;

type ErrorPayload = {
  detail?: string;
  message?: string;
  [key: string]: unknown;
};

type ApiFetchInit = RequestInit & {
  skipAuthRedirect?: boolean;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
};

export type SummaryResponse = {
  portfolio_id?: string | null;
  portfolio_name?: string | null;
  total_value?: number | string | null;
  stock_value?: number | string | null;
  fcn_value?: number | string | null;
  crypto_value?: number | string | null;
  cash_value?: number | string | null;
  risk_level?: string | null;
  top_risk?: string | null;
  ai_advice?: string | null;
};

export type AllocationItem = {
  asset_class: string;
  value: number;
  percentage: number;
};

export type AssetAllocationResponse = {
  portfolio_id?: string | null;
  portfolio_name?: string | null;
  total_value?: number | string | null;
  items?: AllocationItem[] | null;
};

export type DecisionCard = {
  title?: string | null;
  level?: string | null;
  message?: string | null;
  action_label?: string | null;
};

export type AlertItem = {
  id?: string | number | null;
  title?: string | null;
  message?: string | null;
  severity?: string | null;
  level?: string | null;
  asset_class?: string | null;
  asset_ref?: string | null;
  status?: string | null;
};

export type RiskOverviewResponse = {
  portfolio_id?: string | null;
  portfolio_name?: string | null;
  risk_level?: string | null;
  risk_score?: number | string | null;
  top_risk?: string | null;
  decision_cards?: DecisionCard[] | null;
  alerts?: AlertItem[] | null;
  ai_advice?: string | null;
};

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("ixai_token");
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("ixai_token", token);
  window.localStorage.removeItem("token");
}

export function authHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  const token = getToken();

  if (token) {
    nextHeaders.set("Authorization", `Bearer ${token}`);
  }

  return nextHeaders;
}

export function logout() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("ixai_token");
  window.localStorage.removeItem("token");
}

function readableError(payload: unknown, fallback: string) {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;

  if (typeof payload === "object") {
    const data = payload as ErrorPayload;
    if (typeof data.detail === "string") return data.detail;
    if (typeof data.message === "string") return data.message;
  }

  return fallback;
}

async function parseResponse(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T>(
  path: string,
  init: ApiFetchInit = {},
): Promise<T> {
  const { skipAuthRedirect, ...fetchInit } = init;
  const headers = authHeaders(fetchInit.headers);

  if (fetchInit.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const apiBase = resolveApiBase();
  const res = await fetch(path.startsWith("http") ? path : `${apiBase}${path}`, {
    ...fetchInit,
    headers,
  });
  const payload = await parseResponse(res);

  if (!res.ok) {
    if (res.status === 401 && !skipAuthRedirect && typeof window !== "undefined") {
      logout();
      window.location.href = "/login";
    }

    throw new ApiError(
      readableError(payload, `API request failed (${res.status})`),
      res.status,
      payload,
    );
  }

  return payload as T;
}

export async function login(email: string, password: string) {
  const data = await apiFetch<LoginResponse>("/api/v1/auth/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipAuthRedirect: true,
  });
  setToken(data.access_token);
  return data;
}

export function getMySummary() {
  return apiFetch<SummaryResponse>("/api/v1/dashboard/my-summary");
}

export function getMyAssetAllocation() {
  return apiFetch<AssetAllocationResponse>(
    "/api/v1/dashboard/my-asset-allocation",
  );
}

export function getMyRiskOverview() {
  return apiFetch<RiskOverviewResponse>("/api/v1/dashboard/my-risk-overview");
}
