export type OAuthProviderName = "strava" | "oura" | "whoop";

export interface OAuthProviderConfig {
  name: OAuthProviderName;
  displayName: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  // Extra query params some providers require on the authorize URL
  extraAuthParams?: Record<string, string>;
  // Extra body params some providers require when refreshing tokens
  extraRefreshParams?: Record<string, string>;
}

const PROVIDERS: Record<OAuthProviderName, OAuthProviderConfig> = {
  strava: {
    name: "strava",
    displayName: "Strava",
    authorizeUrl: "https://www.strava.com/oauth/authorize",
    tokenUrl: "https://www.strava.com/api/v3/oauth/token",
    scope: "read,activity:read_all",
    clientIdEnv: "STRAVA_CLIENT_ID",
    clientSecretEnv: "STRAVA_CLIENT_SECRET",
    extraAuthParams: { approval_prompt: "auto" },
  },
  oura: {
    name: "oura",
    displayName: "Oura",
    authorizeUrl: "https://cloud.ouraring.com/oauth/authorize",
    tokenUrl: "https://api.ouraring.com/oauth/token",
    scope: "email personal daily heartrate workout session spo2",
    clientIdEnv: "OURA_CLIENT_ID",
    clientSecretEnv: "OURA_CLIENT_SECRET",
  },
  whoop: {
    name: "whoop",
    displayName: "WHOOP",
    authorizeUrl: "https://api.prod.whoop.com/oauth/oauth2/auth",
    tokenUrl: "https://api.prod.whoop.com/oauth/oauth2/token",
    scope:
      "read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline",
    clientIdEnv: "WHOOP_CLIENT_ID",
    clientSecretEnv: "WHOOP_CLIENT_SECRET",
    // WHOOP requires the offline scope to be re-declared on refresh
    extraRefreshParams: { scope: "offline" },
  },
};

export function getProviderConfig(
  provider: string
): OAuthProviderConfig | null {
  if (provider === "strava" || provider === "oura" || provider === "whoop") {
    return PROVIDERS[provider];
  }
  return null;
}

// Unset env vars and example.env-style placeholders ("your_oura_client_id")
// both count as not configured.
function isPlaceholder(value: string | undefined): boolean {
  return !value || value.startsWith("your_");
}

export function getProviderCredentials(config: OAuthProviderConfig): {
  clientId: string;
  clientSecret: string;
} | null {
  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];

  if (isPlaceholder(clientId) || isPlaceholder(clientSecret)) {
    return null;
  }

  return { clientId: clientId!, clientSecret: clientSecret! };
}

// Resolve the app origin for OAuth redirect URIs. Prefer an explicit
// APP_BASE_URL (needed behind proxies), otherwise use the request origin.
export function getAppBaseUrl(requestUrl: string): string {
  return process.env.APP_BASE_URL || new URL(requestUrl).origin;
}

export function getRedirectUri(
  requestUrl: string,
  provider: OAuthProviderName
): string {
  return `${getAppBaseUrl(requestUrl)}/api/auth/${provider}/callback`;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  athlete?: { id?: number; firstname?: string; lastname?: string };
}

export async function exchangeToken(
  config: OAuthProviderConfig,
  params: Record<string, string>
): Promise<{ ok: true; data: OAuthTokenResponse } | { ok: false; error: string; status: number }> {
  const credentials = getProviderCredentials(config);

  if (!credentials) {
    return {
      ok: false,
      error: `Missing ${config.clientIdEnv} / ${config.clientSecretEnv} environment variables`,
      status: 500,
    };
  }

  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    ...params,
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      ok: false,
      error: `${config.displayName} token endpoint error: ${errorText}`,
      status: response.status,
    };
  }

  const data = (await response.json()) as OAuthTokenResponse;
  return { ok: true, data };
}

// Normalize expiry to an absolute unix timestamp (seconds). Strava returns
// expires_at directly; Oura and WHOOP return expires_in.
export function resolveExpiresAt(data: OAuthTokenResponse): number | null {
  if (data.expires_at) {
    return data.expires_at;
  }
  if (data.expires_in) {
    return Math.floor(Date.now() / 1000) + data.expires_in;
  }
  return null;
}
