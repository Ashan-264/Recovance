import { getFreshAccessToken, loadTokens, refreshTokens } from "./oauthClient";

export class StravaError extends Error {
  readonly needsReconnect: boolean;

  constructor(message: string, needsReconnect = false) {
    super(message);
    this.name = "StravaError";
    this.needsReconnect = needsReconnect;
  }
}

function envFallbackToken(): string {
  return process.env.NEXT_PUBLIC_STRAVA_API_TOKEN || "";
}

async function currentToken(): Promise<string> {
  // Refreshes automatically when the stored token has expired.
  const token = await getFreshAccessToken("strava");

  if (token) {
    return token;
  }

  const fallback = envFallbackToken();

  if (fallback) {
    return fallback;
  }

  throw new StravaError(
    "Not connected to Strava. Open the Connect page to link your account.",
    true
  );
}

// Strava marks an application Inactive when it has not been approved or has
// had its API access suspended. Every data request is refused until it is
// reactivated, and refreshing tokens cannot help.
function isApplicationInactive(message: string): boolean {
  return message.includes('"Status"') && message.includes('"Inactive"');
}

function isRateLimited(status: number, message: string): boolean {
  return status === 429 || message.includes("Rate Limit Exceeded");
}

// A token created from strava.com/settings/api carries only `scope: read`,
// which cannot list activities. Refreshing preserves the original scope, so
// the only cure is re-authorizing through /connect for activity:read_all.
function isMissingScope(message: string): boolean {
  return message.includes("activity:read_permission") || message.includes('"code":"missing"');
}

function isAuthFailure(status: number, message: string): boolean {
  if (
    isApplicationInactive(message) ||
    isRateLimited(status, message) ||
    isMissingScope(message)
  ) {
    return false; // a new token would be refused too
  }

  return (
    status === 401 ||
    message.includes("Authorization Error") ||
    message.includes("invalid")
  );
}

// Turn Strava's raw JSON errors into something a user can act on.
function friendlyMessage(status: number, message: string): string {
  if (isApplicationInactive(message)) {
    return (
      "Strava has this API application marked Inactive, so it will not return data. " +
      "Open strava.com/settings/api, confirm the application is active and the API " +
      "agreement is accepted. Reconnecting or refreshing tokens will not help until then."
    );
  }

  if (isRateLimited(status, message)) {
    return "Strava's rate limit was reached. Wait about 15 minutes and try again.";
  }

  if (isMissingScope(message)) {
    return (
      "This Strava token does not include activity read permission. Tokens copied " +
      "from strava.com/settings/api only carry 'read' scope — connect through the " +
      "Connect page instead, which requests activity:read_all."
    );
  }

  return message;
}

async function readError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return typeof data?.error === "string" ? data.error : response.statusText;
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

/**
 * POSTs to one of the app's Strava proxy routes with the current access token.
 *
 * Strava access tokens last six hours, so an expired token is refreshed and the
 * request retried once. Failures throw with the message Strava actually
 * returned rather than a generic one.
 */
export async function postStrava<T>(
  endpoint: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  let token = await currentToken();

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, access_token: token }),
    });

    if (response.ok) {
      return (await response.json()) as T;
    }

    const message = await readError(response);

    if (attempt === 0 && isAuthFailure(response.status, message)) {
      // The token was rejected — refresh once, then retry.
      const refreshed = await refreshTokens("strava");

      if (refreshed?.accessToken && refreshed.accessToken !== token) {
        token = refreshed.accessToken;
        continue;
      }

      throw new StravaError(
        loadTokens("strava")
          ? "Your Strava session expired and could not be refreshed. Reconnect on the Connect page."
          : "Strava rejected the configured access token. Connect your account on the Connect page.",
        true
      );
    }

    throw new StravaError(friendlyMessage(response.status, message));
  }

  throw new StravaError("Strava request failed after retrying.");
}

/**
 * Reads activities already stored in the database.
 *
 * Deliberately does not attach or require a token: this runs on page load, and
 * a missing or expired Strava connection should not stop stored data from
 * rendering. Returns an empty array rather than throwing so a cold cache is a
 * quiet no-op instead of an error banner.
 */
export async function loadCachedActivities<T>(
  startDate: string,
  endDate: string
): Promise<T[]> {
  try {
    const response = await fetch("/api/strava/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate,
        cache_only: true,
        slim: true,
      }),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.activities as T[]) || [];
  } catch (error) {
    console.error("Could not read cached activities:", error);
    return [];
  }
}

export function describeStravaError(error: unknown): string {
  if (error instanceof StravaError) {
    return error.message;
  }
  return error instanceof Error ? error.message : "Unknown error";
}
