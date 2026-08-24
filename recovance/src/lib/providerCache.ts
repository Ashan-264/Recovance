import { Prisma } from "@/generated/prisma";
import { prisma } from "./prisma";
import { getProviderToken } from "./providerAccounts";
import { OAuthProviderName } from "./oauthProviders";

export class ProviderRequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "ProviderRequestError";
    this.status = status;
  }
}

export interface CachedResult<T> {
  data: T;
  fromCache: boolean;
  /** Set when the cache was served because the provider request failed. */
  stale?: boolean;
  fetchedAt: Date;
}

/** Resources that never change once written, so they never need refetching. */
export const NEVER_EXPIRES = null;
export const ONE_HOUR = 3600;
export const ONE_DAY = 86_400;

async function readEntry(userId: string, provider: string, resource: string) {
  return prisma.providerCacheEntry.findUnique({
    where: { userId_provider_resource: { userId, provider, resource } },
  });
}

/**
 * Read-through cache for a single provider resource.
 *
 * Order of preference: fresh cache → provider → stale cache. That last step
 * matters: when the provider is down, rate-limiting, or the app has been
 * deactivated, showing data from yesterday beats showing an error, as long as
 * the caller can tell the difference (`stale: true`).
 */
export async function getOrFetch<T>(options: {
  userId: string;
  provider: OAuthProviderName;
  resource: string;
  ttlSeconds: number | null;
  /** Receives a valid access token; should throw ProviderRequestError on failure. */
  fetcher: (accessToken: string) => Promise<T>;
  /** Skip the provider entirely and serve only what is stored. */
  cacheOnly?: boolean;
}): Promise<CachedResult<T> | null> {
  const { userId, provider, resource, ttlSeconds, fetcher, cacheOnly } = options;

  const existing = await readEntry(userId, provider, resource);
  const fresh =
    existing && (!existing.expiresAt || existing.expiresAt > new Date());

  if (fresh || (existing && cacheOnly)) {
    return {
      data: existing!.payload as T,
      fromCache: true,
      fetchedAt: existing!.fetchedAt,
    };
  }

  if (cacheOnly) {
    return null;
  }

  const token = await getProviderToken(userId, provider);

  if (!token) {
    if (existing) {
      return {
        data: existing.payload as T,
        fromCache: true,
        stale: true,
        fetchedAt: existing.fetchedAt,
      };
    }
    throw new ProviderRequestError(
      `Not connected to ${provider}. Connect the account at /connect.`,
      503
    );
  }

  try {
    const data = await fetcher(token.accessToken);
    const now = new Date();

    const stored = await prisma.providerCacheEntry.upsert({
      where: { userId_provider_resource: { userId, provider, resource } },
      create: {
        userId,
        provider,
        resource,
        payload: data as Prisma.InputJsonValue,
        expiresAt: ttlSeconds ? new Date(now.getTime() + ttlSeconds * 1000) : null,
      },
      update: {
        payload: data as Prisma.InputJsonValue,
        fetchedAt: now,
        expiresAt: ttlSeconds ? new Date(now.getTime() + ttlSeconds * 1000) : null,
      },
    });

    return { data, fromCache: false, fetchedAt: stored.fetchedAt };
  } catch (error) {
    if (existing) {
      console.warn(
        `${provider}/${resource} fetch failed, serving cached copy:`,
        (error as Error).message
      );
      return {
        data: existing.payload as T,
        fromCache: true,
        stale: true,
        fetchedAt: existing.fetchedAt,
      };
    }
    throw error;
  }
}

/** Standard JSON fetch that turns a non-2xx into a ProviderRequestError. */
export async function fetchJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new ProviderRequestError(
      `Provider error: ${await response.text()}`,
      response.status
    );
  }

  return (await response.json()) as T;
}
