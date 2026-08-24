import { NextResponse } from "next/server";
import {
  getProviderConfig,
  getProviderCredentials,
  OAuthProviderName,
} from "@/lib/oauthProviders";

const PROVIDERS: OAuthProviderName[] = ["strava", "oura", "whoop"];

// Report which providers have OAuth credentials configured so the UI can
// show setup instructions instead of a Connect button that cannot work.
// Only booleans and env var names are returned — never secret values.
export async function GET() {
  const providers = PROVIDERS.map((name) => {
    const config = getProviderConfig(name)!;
    return {
      name,
      displayName: config.displayName,
      configured: getProviderCredentials(config) !== null,
      clientIdEnv: config.clientIdEnv,
      clientSecretEnv: config.clientSecretEnv,
    };
  });

  return NextResponse.json({
    providers,
    // Oura works without OAuth when a personal access token is on the server
    ouraServerTokenAvailable: Boolean(process.env.OURA_API_TOKEN),
  });
}
