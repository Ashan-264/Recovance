import {
  exchangeToken,
  getProviderConfig,
  resolveExpiresAt,
  OAuthProviderName,
} from "./oauthProviders";
import { prisma } from "./prisma";

export interface ProviderToken {
  accessToken: string;
  source: "account" | "environment";
}

// Server-side tokens usable when no OAuth account is linked. Oura's personal
// access token is the common self-hosted setup.
const ENV_FALLBACK: Partial<Record<OAuthProviderName, string>> = {
  oura: "OURA_API_TOKEN",
};

function envToken(provider: OAuthProviderName): string | null {
  const key = ENV_FALLBACK[provider];
  const value = key ? process.env[key] : undefined;
  return value && !value.startsWith("your_") ? value : null;
}

/**
 * Returns a usable access token for a provider, refreshing a stored OAuth
 * token that has expired. Falls back to a server-side token when the user has
 * not linked an account.
 */
export async function getProviderToken(
  userId: string,
  provider: OAuthProviderName
): Promise<ProviderToken | null> {
  const account = await prisma.connectedAccount.findUnique({
    where: { userId_provider: { userId, provider } },
  });

  if (!account) {
    const fallback = envToken(provider);
    return fallback ? { accessToken: fallback, source: "environment" } : null;
  }

  const expiresSoon =
    account.expiresAt && account.expiresAt.getTime() - 60_000 <= Date.now();

  if (expiresSoon && account.refreshToken) {
    const config = getProviderConfig(provider);

    if (config) {
      const result = await exchangeToken(config, {
        grant_type: "refresh_token",
        refresh_token: account.refreshToken,
        ...(config.extraRefreshParams || {}),
      });

      if (result.ok) {
        const expiresAt = resolveExpiresAt(result.data);

        const updated = await prisma.connectedAccount.update({
          where: { id: account.id },
          data: {
            accessToken: result.data.access_token,
            refreshToken: result.data.refresh_token || account.refreshToken,
            expiresAt: expiresAt ? new Date(expiresAt * 1000) : null,
          },
        });

        return { accessToken: updated.accessToken, source: "account" };
      }

      console.error(
        `Could not refresh ${provider} token for user ${userId}:`,
        result.error
      );
    }
  }

  return { accessToken: account.accessToken, source: "account" };
}

export interface ProviderIdentity {
  providerAccountId: string;
  email: string | null;
  displayName: string | null;
}

/**
 * Identifies the account behind a freshly issued token. Strava returns the
 * athlete inline with the token; Oura and WHOOP need one extra call.
 */
export async function fetchProviderIdentity(
  provider: OAuthProviderName,
  accessToken: string,
  tokenResponse: { athlete?: { id?: number; firstname?: string; lastname?: string } }
): Promise<ProviderIdentity> {
  if (provider === "strava") {
    const athlete = tokenResponse.athlete;
    return {
      providerAccountId: athlete?.id ? String(athlete.id) : "unknown",
      email: null,
      displayName:
        [athlete?.firstname, athlete?.lastname].filter(Boolean).join(" ") || null,
    };
  }

  const endpoint =
    provider === "oura"
      ? "https://api.ouraring.com/v2/usercollection/personal_info"
      : "https://api.prod.whoop.com/developer/v2/user/profile/basic";

  try {
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      return { providerAccountId: "unknown", email: null, displayName: null };
    }

    const profile = await response.json();

    return {
      providerAccountId: String(profile.id ?? profile.user_id ?? "unknown"),
      email: profile.email ?? null,
      displayName:
        profile.first_name
          ? [profile.first_name, profile.last_name].filter(Boolean).join(" ")
          : null,
    };
  } catch (error) {
    console.error(`Could not read ${provider} profile:`, error);
    return { providerAccountId: "unknown", email: null, displayName: null };
  }
}

/**
 * Decides which user an OAuth connection belongs to.
 *
 * Reconnecting the same provider account returns the original user. Otherwise
 * the connection attaches to the current session, or to the single-user
 * "local" account so a self-hosted install keeps the data it already cached
 * rather than stranding it under a second user.
 */
export async function resolveUserForConnection(params: {
  provider: OAuthProviderName;
  identity: ProviderIdentity;
  sessionUserId?: string | null;
}): Promise<string> {
  const existing = await prisma.connectedAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: params.provider,
        providerAccountId: params.identity.providerAccountId,
      },
    },
    select: { userId: true },
  });

  if (existing) {
    return existing.userId;
  }

  if (params.sessionUserId) {
    return params.sessionUserId;
  }

  const local = await prisma.user.findFirst({ where: { isLocal: true } });

  if (local) {
    await prisma.user.update({
      where: { id: local.id },
      data: {
        email: local.email ?? params.identity.email ?? undefined,
        displayName: local.displayName === "Local"
          ? params.identity.displayName ?? local.displayName
          : local.displayName,
      },
    });
    return local.id;
  }

  const created = await prisma.user.create({
    data: {
      email: params.identity.email ?? undefined,
      displayName: params.identity.displayName ?? undefined,
    },
  });

  return created.id;
}

/** Creates or updates the stored account after an OAuth callback. */
export async function upsertConnectedAccount(params: {
  userId: string;
  provider: OAuthProviderName;
  providerAccountId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  scope?: string | null;
}) {
  const data = {
    accessToken: params.accessToken,
    refreshToken: params.refreshToken ?? null,
    expiresAt: params.expiresAt ? new Date(params.expiresAt * 1000) : null,
    scope: params.scope ?? null,
    providerAccountId: params.providerAccountId,
  };

  return prisma.connectedAccount.upsert({
    where: {
      userId_provider: { userId: params.userId, provider: params.provider },
    },
    create: { userId: params.userId, provider: params.provider, ...data },
    update: data,
  });
}
