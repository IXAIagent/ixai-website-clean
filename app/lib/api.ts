"use client";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

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

  const res = await fetch(path.startsWith("http") ? path : `${API_BASE}${path}`, {
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
