"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export const WORKSPACE_CONTEXT_STORAGE_KEY = "ixai_workspace_context_v1";

export type WorkspaceContextState = {
  selectedAccountId: string;
  selectedPortfolioId: string;
  selectedAccountName: string;
  selectedPortfolioName: string;
  lastActiveWorkspace: string;
  updatedAt: string;
};

export const defaultWorkspaceContext: WorkspaceContextState = {
  selectedAccountId: "",
  selectedPortfolioId: "",
  selectedAccountName: "",
  selectedPortfolioName: "",
  lastActiveWorkspace: "dashboard",
  updatedAt: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeContext(value: unknown): WorkspaceContextState {
  if (!isRecord(value)) return defaultWorkspaceContext;
  return {
    selectedAccountId: stringValue(value.selectedAccountId),
    selectedPortfolioId: stringValue(value.selectedPortfolioId),
    selectedAccountName: stringValue(value.selectedAccountName),
    selectedPortfolioName: stringValue(value.selectedPortfolioName),
    lastActiveWorkspace: stringValue(value.lastActiveWorkspace) || defaultWorkspaceContext.lastActiveWorkspace,
    updatedAt: stringValue(value.updatedAt),
  };
}

export function readWorkspaceContext(): WorkspaceContextState {
  if (typeof window === "undefined") return defaultWorkspaceContext;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_CONTEXT_STORAGE_KEY);
    return raw ? normalizeContext(JSON.parse(raw)) : defaultWorkspaceContext;
  } catch {
    return defaultWorkspaceContext;
  }
}

export function writeWorkspaceContext(context: WorkspaceContextState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      WORKSPACE_CONTEXT_STORAGE_KEY,
      JSON.stringify(normalizeContext({ ...context, updatedAt: new Date().toISOString() })),
    );
  } catch {
    // Keep the workspace operational if localStorage is unavailable.
  }
}

export function useWorkspaceContext() {
  const [context, setContextState] = useState<WorkspaceContextState>(defaultWorkspaceContext);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setContextState(readWorkspaceContext());
    }, 0);

    function handleStorage(event: StorageEvent) {
      if (event.key === WORKSPACE_CONTEXT_STORAGE_KEY) {
        setContextState(readWorkspaceContext());
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setWorkspaceContext = useCallback((patch: Partial<WorkspaceContextState>) => {
    setContextState((current) => {
      const next = normalizeContext({ ...current, ...patch });
      writeWorkspaceContext(next);
      return { ...next, updatedAt: new Date().toISOString() };
    });
  }, []);

  const resetWorkspaceContext = useCallback(() => {
    setContextState(defaultWorkspaceContext);
    writeWorkspaceContext(defaultWorkspaceContext);
  }, []);

  return useMemo(
    () => ({
      context,
      setWorkspaceContext,
      resetWorkspaceContext,
    }),
    [context, resetWorkspaceContext, setWorkspaceContext],
  );
}
