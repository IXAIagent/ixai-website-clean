export const LEGACY_SSO_SESSION_KEY = "ixai_sso_session";
export const LEGACY_SSO_TOKEN_PREFIX = "ixai_sso_v2.";

const LEGACY_SSO_TOKEN_PREFIX_V1 = "ixai_sso_v1.";
const DEFAULT_SSO_SESSION_TTL_MS = 30 * 60 * 1000;
const TOKEN_STORAGE_KEY = "ixai_token";
const LEGACY_TOKEN_STORAGE_KEY = "token";

export type IxaiSsoSession = {
  appUserIdTail: string;
  expiresAt: number;
  issuedAt: number;
  maskedEmail?: string;
  provider: "supabase";
  source: "ixai-app";
  type: "ixai_sso_v2";
};

export type ProSession =
  | {
      kind: "legacy_jwt";
      token: string;
    }
  | {
      kind: "sso";
      session: IxaiSsoSession;
      token: string;
    };

function safeEncode(value: unknown) {
  const json = JSON.stringify(value);
  return window.btoa(encodeURIComponent(json));
}

function createSsoToken(session: IxaiSsoSession) {
  return `${LEGACY_SSO_TOKEN_PREFIX}${safeEncode({
    appUserIdTail: session.appUserIdTail,
    expiresAt: session.expiresAt,
    issuedAt: session.issuedAt,
    provider: session.provider,
    source: session.source,
    type: session.type,
  })}`;
}

function clearSsoOnly() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_SSO_SESSION_KEY);
}

function readStoredSsoSession(): IxaiSsoSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LEGACY_SSO_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<IxaiSsoSession>;
    const session: IxaiSsoSession = {
      appUserIdTail: typeof parsed.appUserIdTail === "string" ? parsed.appUserIdTail : "",
      expiresAt: typeof parsed.expiresAt === "number" ? parsed.expiresAt : 0,
      issuedAt: typeof parsed.issuedAt === "number" ? parsed.issuedAt : 0,
      maskedEmail: typeof parsed.maskedEmail === "string" ? parsed.maskedEmail : undefined,
      provider: "supabase",
      source: "ixai-app",
      type: "ixai_sso_v2",
    };

    if (!session.appUserIdTail || isSessionExpired(session)) {
      clearSsoOnly();
      if (isSsoSession(window.localStorage.getItem(TOKEN_STORAGE_KEY))) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
      return null;
    }

    return session;
  } catch {
    clearSsoOnly();
    return null;
  }
}

export function isSsoSession(token: string | null | undefined) {
  return Boolean(
    token?.startsWith(LEGACY_SSO_TOKEN_PREFIX) ||
      token?.startsWith(LEGACY_SSO_TOKEN_PREFIX_V1),
  );
}

export function isLegacyJwtSession(token: string | null | undefined): token is string {
  return Boolean(token && !isSsoSession(token));
}

export function isSessionExpired(session: Pick<IxaiSsoSession, "expiresAt"> | null | undefined) {
  return !session || session.expiresAt <= Date.now();
}

export function getProSession(): ProSession | null {
  if (typeof window === "undefined") return null;

  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);

  if (isLegacyJwtSession(token)) {
    return { kind: "legacy_jwt", token };
  }

  const session = readStoredSsoSession();
  if (!session) {
    if (isSsoSession(token)) {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    return null;
  }

  const ssoToken = createSsoToken(session);
  if (token !== ssoToken) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, ssoToken);
  }

  return {
    kind: "sso",
    session,
    token: ssoToken,
  };
}

export function setProSsoSession({
  appUserIdTail,
  maskedEmail,
}: {
  appUserIdTail?: string | null;
  maskedEmail?: string | null;
}): IxaiSsoSession {
  if (typeof window === "undefined") {
    throw new Error("Pro SSO session can only be created in the browser.");
  }

  const issuedAt = Date.now();
  const session: IxaiSsoSession = {
    appUserIdTail: appUserIdTail || "unknown",
    expiresAt: issuedAt + DEFAULT_SSO_SESSION_TTL_MS,
    issuedAt,
    maskedEmail: maskedEmail || undefined,
    provider: "supabase",
    source: "ixai-app",
    type: "ixai_sso_v2",
  };

  window.localStorage.setItem(LEGACY_SSO_SESSION_KEY, JSON.stringify(session));
  window.localStorage.setItem(TOKEN_STORAGE_KEY, createSsoToken(session));
  window.localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);

  return session;
}

export function clearProSession() {
  if (typeof window === "undefined") return;
  clearSsoOnly();
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
}

export function clearLegacySsoSession() {
  clearSsoOnly();
  if (typeof window === "undefined") return;
  if (isSsoSession(window.localStorage.getItem(TOKEN_STORAGE_KEY))) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getStoredLegacySsoSession() {
  return readStoredSsoSession();
}

export function isLegacySsoToken(token: string | null | undefined) {
  return isSsoSession(token);
}

export function createLegacySsoSession({
  emailMasked,
  userIdTail,
}: {
  emailMasked?: string | null;
  userIdTail?: string | null;
}) {
  return setProSsoSession({
    appUserIdTail: userIdTail,
    maskedEmail: emailMasked,
  });
}
