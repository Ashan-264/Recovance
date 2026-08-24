import { NextRequest } from "next/server";
import { getProviderToken } from "./providerAccounts";
import { getCurrentUser } from "./session";

/**
 * Resolves an Oura access token for a request.
 *
 * Preference order:
 *   1. an explicit `Authorization: Bearer …` header (legacy clients that still
 *      hold a token in the browser),
 *   2. the signed-in user's stored Oura connection, refreshed if expired,
 *   3. the server-wide personal access token.
 *
 * Most callers now hit case 2 or 3, so the browser no longer needs a token.
 */
export async function getOuraToken(req: NextRequest): Promise<string | null> {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    if (token) {
      return token;
    }
  }

  try {
    const user = await getCurrentUser(req);
    const stored = await getProviderToken(user.id, "oura");
    if (stored) {
      return stored.accessToken;
    }
  } catch (error) {
    console.error("Could not resolve the Oura connection:", error);
  }

  const fallback = process.env.OURA_API_TOKEN;
  return fallback && !fallback.startsWith("your_") ? fallback : null;
}
