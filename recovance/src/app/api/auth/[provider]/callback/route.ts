import { NextRequest, NextResponse } from "next/server";
import {
  exchangeToken,
  getAppBaseUrl,
  getProviderConfig,
  getRedirectUri,
  resolveExpiresAt,
} from "@/lib/oauthProviders";
import {
  fetchProviderIdentity,
  resolveUserForConnection,
  upsertConnectedAccount,
} from "@/lib/providerAccounts";
import { prisma } from "@/lib/prisma";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

// Redirect back to the connect page with an error message in the query string.
function redirectWithError(baseUrl: string, provider: string, message: string) {
  const url = new URL("/connect", baseUrl);
  url.searchParams.set("provider", provider);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url.toString());
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const config = getProviderConfig(provider);
  const baseUrl = getAppBaseUrl(req.url);

  if (!config) {
    return NextResponse.json(
      { error: `Unknown OAuth provider: ${provider}` },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(req.url);
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (error) {
    return redirectWithError(baseUrl, config.name, `Authorization denied: ${error}`);
  }

  if (!code) {
    return redirectWithError(baseUrl, config.name, "Missing authorization code");
  }

  const expectedState = req.cookies.get(`oauth_state_${config.name}`)?.value;

  if (!expectedState || state !== expectedState) {
    return redirectWithError(
      baseUrl,
      config.name,
      "Invalid state parameter. Please try connecting again."
    );
  }

  try {
    const result = await exchangeToken(config, {
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(req.url, config.name),
    });

    if (!result.ok) {
      console.error(`${config.displayName} token exchange failed:`, result.error);
      return redirectWithError(baseUrl, config.name, "Token exchange failed");
    }

    const expiresAt = resolveExpiresAt(result.data);

    // Persist the connection server-side and sign the browser in, so cached
    // reads and token refreshes no longer depend on localStorage.
    const identity = await fetchProviderIdentity(
      config.name,
      result.data.access_token,
      result.data
    );

    const existingSessionToken = req.cookies.get(SESSION_COOKIE)?.value;
    const existingSession = existingSessionToken
      ? await prisma.session.findUnique({
          where: { token: existingSessionToken },
          select: { userId: true, expiresAt: true },
        })
      : null;

    const userId = await resolveUserForConnection({
      provider: config.name,
      identity,
      sessionUserId:
        existingSession && existingSession.expiresAt > new Date()
          ? existingSession.userId
          : null,
    });

    await upsertConnectedAccount({
      userId,
      provider: config.name,
      providerAccountId: identity.providerAccountId,
      accessToken: result.data.access_token,
      refreshToken: result.data.refresh_token,
      expiresAt,
      scope: result.data.scope,
    });

    const session = await createSession(userId);

    // Tokens travel in the URL hash so they never reach server logs;
    // the /connect page reads the hash and persists them client-side.
    const hash = new URLSearchParams({
      provider: config.name,
      access_token: result.data.access_token,
      ...(result.data.refresh_token
        ? { refresh_token: result.data.refresh_token }
        : {}),
      ...(expiresAt ? { expires_at: String(expiresAt) } : {}),
      ...(result.data.athlete?.firstname
        ? { account: result.data.athlete.firstname }
        : {}),
    });

    const response = NextResponse.redirect(`${baseUrl}/connect#${hash.toString()}`);
    response.cookies.delete(`oauth_state_${config.name}`);
    response.cookies.set(
      SESSION_COOKIE,
      session.token,
      sessionCookieOptions(session.expiresAt)
    );
    return response;
  } catch (err) {
    console.error(`Error during ${config.displayName} OAuth callback:`, err);
    return redirectWithError(baseUrl, config.name, "Internal error during token exchange");
  }
}
