"use client";

const LOCAL_API_BASE = "http://127.0.0.1:8000";

function resolveApiBase() {
  const configuredBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configuredBase) {
    return configuredBase.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is required in production");
  }

  return LOCAL_API_BASE;
}

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") || LOCAL_API_BASE;

type ErrorPayload = {
  detail?: string;
  message?: string;
  [key: string]: unknown;
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
  init: RequestInit = {},
): Promise<T> {
  const headers = authHeaders(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const apiBase = resolveApiBase();
  const res = await fetch(path.startsWith("http") ? path : `${apiBase}${path}`, {
    ...init,
    headers,
  });

  const payload = await parseResponse(res);

  if (!res.ok) {
    throw new ApiError(
      readableError(payload, `API request failed (${res.status})`),
      res.status,
      payload,
    );
  }

  return payload as T;
}
