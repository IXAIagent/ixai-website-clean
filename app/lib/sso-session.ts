export const LEGACY_SSO_SESSION_KEY = "ixai_sso_session";
export const LEGACY_SSO_TOKEN_PREFIX = "ixai_sso_v1.";

const DEFAULT_SSO_SESSION_TTL_MS = 30 * 60 * 1000;

export type LegacySsoSession = {
  createdAt: string;
  emailMasked: string | null;
  expiresAt: string;
  source: "ixai-app";
  token: string;
  userIdTail: string | null;
};

function createTokenPayload(session: Omit<LegacySsoSession, "token">) {
  const json = JSON.stringify({
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    source: session.source,
    userIdTail: session.userIdTail,
  });

  return window.btoa(encodeURIComponent(json));
}

export function isLegacySsoToken(token: string | null | undefined) {
  return Boolean(token?.startsWith(LEGACY_SSO_TOKEN_PREFIX));
}

export function clearLegacySsoSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_SSO_SESSION_KEY);
}

export function getStoredLegacySsoSession(): LegacySsoSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LEGACY_SSO_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<LegacySsoSession>;
    if (!parsed.token || !isLegacySsoToken(parsed.token) || !parsed.expiresAt) {
      clearLegacySsoSession();
      return null;
    }

    if (Date.parse(parsed.expiresAt) <= Date.now()) {
      clearLegacySsoSession();
      window.localStorage.removeItem("ixai_token");
      return null;
    }

    return {
      createdAt: parsed.createdAt || new Date().toISOString(),
      emailMasked: parsed.emailMasked || null,
      expiresAt: parsed.expiresAt,
      source: "ixai-app",
      token: parsed.token,
      userIdTail: parsed.userIdTail || null,
    };
  } catch {
    clearLegacySsoSession();
    return null;
  }
}

export function createLegacySsoSession({
  emailMasked,
  userIdTail,
}: {
  emailMasked?: string | null;
  userIdTail?: string | null;
}): LegacySsoSession {
  if (typeof window === "undefined") {
    throw new Error("Legacy SSO session can only be created in the browser.");
  }

  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + DEFAULT_SSO_SESSION_TTL_MS);
  const tokenBody = createTokenPayload({
    createdAt: createdAt.toISOString(),
    emailMasked: emailMasked || null,
    expiresAt: expiresAt.toISOString(),
    source: "ixai-app",
    userIdTail: userIdTail || null,
  });
  const token = `${LEGACY_SSO_TOKEN_PREFIX}${tokenBody}`;
  const session: LegacySsoSession = {
    createdAt: createdAt.toISOString(),
    emailMasked: emailMasked || null,
    expiresAt: expiresAt.toISOString(),
    source: "ixai-app",
    token,
    userIdTail: userIdTail || null,
  };

  window.localStorage.setItem(LEGACY_SSO_SESSION_KEY, JSON.stringify(session));
  window.localStorage.setItem("ixai_token", token);
  window.localStorage.removeItem("token");

  return session;
}
