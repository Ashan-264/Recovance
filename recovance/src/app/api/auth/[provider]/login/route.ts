import { NextRequest, NextResponse } from "next/server";
import {
  getAppBaseUrl,
  getProviderConfig,
  getProviderCredentials,
  getRedirectUri,
} from "@/lib/oauthProviders";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const config = getProviderConfig(provider);

  if (!config) {
    return NextResponse.json(
      { error: `Unknown OAuth provider: ${provider}` },
      { status: 404 }
    );
  }

  const credentials = getProviderCredentials(config);

  if (!credentials) {
    // Send the user back to /connect with a readable banner instead of
    // bouncing them to the provider with a placeholder client_id.
    const url = new URL("/connect", getAppBaseUrl(req.url));
    url.searchParams.set("provider", config.name);
    url.searchParams.set(
      "error",
      `${config.displayName} OAuth is not configured yet. Set ${config.clientIdEnv} and ${config.clientSecretEnv} in .env.local and restart the server.`
    );
    return NextResponse.redirect(url.toString());
  }

  const state = crypto.randomUUID();

  const authorizeUrl = new URL(config.authorizeUrl);
  authorizeUrl.searchParams.set("client_id", credentials.clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set(
    "redirect_uri",
    getRedirectUri(req.url, config.name)
  );
  authorizeUrl.searchParams.set("scope", config.scope);
  authorizeUrl.searchParams.set("state", state);

  for (const [key, value] of Object.entries(config.extraAuthParams || {})) {
    authorizeUrl.searchParams.set(key, value);
  }

  const response = NextResponse.redirect(authorizeUrl.toString());
  response.cookies.set(`oauth_state_${config.name}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
