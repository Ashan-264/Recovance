// Client-side helpers for storing and refreshing OAuth tokens.
// Tokens live in localStorage; components read them via these helpers
// (or via StravaContext, which wraps them for Strava).

export type ProviderName = "strava" | "oura" | "whoop";

export interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // unix seconds
  account?: string;
}

export const TOKENS_UPDATED_EVENT = "recovance:oauth-tokens-updated";

// "strava_token" predates the OAuth flow — keep it so manually-entered
// tokens and older sessions continue to work.
const ACCESS_TOKEN_KEYS: Record<ProviderName, string> = {
  strava: "strava_token",
  oura: "oura_token",
  whoop: "whoop_token",
};

function key(provider: ProviderName, suffix: string): string {
  return `${provider}_${suffix}`;
}

export function loadTokens(provider: ProviderName): StoredTokens | null {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEYS[provider]);
  if (!accessToken) {
    return null;
  }

  const expiresAtRaw = localStorage.getItem(key(provider, "expires_at"));

  return {
    accessToken,
    refreshToken: localStorage.getItem(key(provider, "refresh_token")) || undefined,
    expiresAt: expiresAtRaw ? parseInt(expiresAtRaw, 10) : undefined,
    account: localStorage.getItem(key(provider, "account")) || undefined,
  };
}

export function saveTokens(provider: ProviderName, tokens: StoredTokens): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(ACCESS_TOKEN_KEYS[provider], tokens.accessToken);

  if (tokens.refreshToken) {
    localStorage.setItem(key(provider, "refresh_token"), tokens.refreshToken);
  }
  if (tokens.expiresAt) {
    localStorage.setItem(key(provider, "expires_at"), String(tokens.expiresAt));
  }
  if (tokens.account) {
    localStorage.setItem(key(provider, "account"), tokens.account);
  }

  window.dispatchEvent(
    new CustomEvent(TOKENS_UPDATED_EVENT, { detail: { provider } })
  );
}

export function clearTokens(provider: ProviderName): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEYS[provider]);
  localStorage.removeItem(key(provider, "refresh_token"));
  localStorage.removeItem(key(provider, "expires_at"));
  localStorage.removeItem(key(provider, "account"));

  window.dispatchEvent(
    new CustomEvent(TOKENS_UPDATED_EVENT, { detail: { provider } })
  );
}

export function isExpired(
  tokens: StoredTokens,
  skewSeconds: number = 300
): boolean {
  if (!tokens.expiresAt) {
    return false; // manually-entered tokens have no known expiry
  }
  return tokens.expiresAt - skewSeconds <= Math.floor(Date.now() / 1000);
}

// Refresh via our server route (which holds the client secret) and persist
// the new tokens. Returns null if refresh is impossible or fails.
export async function refreshTokens(
  provider: ProviderName
): Promise<StoredTokens | null> {
  const current = loadTokens(provider);

  if (!current?.refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`/api/auth/${provider}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: current.refreshToken }),
    });

    if (!response.ok) {
      console.error(
        `Failed to refresh ${provider} token:`,
        await response.text()
      );
      return null;
    }

    const data = await response.json();
    const updated: StoredTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || current.refreshToken,
      expiresAt: data.expires_at || undefined,
      account: current.account,
    };

    saveTokens(provider, updated);
    return updated;
  } catch (error) {
    console.error(`Error refreshing ${provider} token:`, error);
    return null;
  }
}

// Attach the stored access token for a provider to a set of request
// headers. Server routes fall back to env tokens when the header is absent.
export function withProviderAuth(
  provider: ProviderName,
  headers: Record<string, string> = {}
): Record<string, string> {
  const tokens = loadTokens(provider);
  if (tokens?.accessToken) {
    return { ...headers, Authorization: `Bearer ${tokens.accessToken}` };
  }
  return headers;
}

// Get a usable access token, refreshing first when it is expired.
export async function getFreshAccessToken(
  provider: ProviderName
): Promise<string | null> {
  const tokens = loadTokens(provider);

  if (!tokens) {
    return null;
  }

  if (isExpired(tokens)) {
    const refreshed = await refreshTokens(provider);
    return refreshed?.accessToken || null;
  }

  return tokens.accessToken;
}
