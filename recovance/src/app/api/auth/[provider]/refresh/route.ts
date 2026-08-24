import { NextRequest, NextResponse } from "next/server";
import {
  exchangeToken,
  getProviderConfig,
  resolveExpiresAt,
} from "@/lib/oauthProviders";

export async function POST(
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

  try {
    const { refresh_token } = await req.json();

    if (!refresh_token) {
      return NextResponse.json(
        { error: "Missing refresh_token" },
        { status: 400 }
      );
    }

    const result = await exchangeToken(config, {
      grant_type: "refresh_token",
      refresh_token,
      ...(config.extraRefreshParams || {}),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      access_token: result.data.access_token,
      refresh_token: result.data.refresh_token || refresh_token,
      expires_at: resolveExpiresAt(result.data),
    });
  } catch (error) {
    console.error(`Error refreshing ${config.displayName} token:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
