import { NextRequest, NextResponse } from "next/server";
import {
  CorosApiError,
  corosMobileLogin,
  corosWebLogin,
  hashCorosPassword,
  saveCorosAccount,
} from "@/lib/coros";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  getCurrentUser,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

// COROS has no OAuth, so unlike the other providers this route signs in with
// account credentials directly. Only the md5 hash of the password is stored
// (see CorosSecrets in lib/coros.ts) so tokens can be refreshed server-side.

type CorosRegion = "us" | "eu" | "asia";

export async function POST(req: NextRequest) {
  let email: string, password: string, region: CorosRegion;
  try {
    const body = await req.json();
    email = String(body.email || "").trim();
    password = String(body.password || "");
    region = body.region === "eu" || body.region === "asia" ? body.region : "us";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: "Missing email or password" },
      { status: 400 }
    );
  }

  const pwdHash = hashCorosPassword(password);

  try {
    const web = await corosWebLogin(email, pwdHash, region);

    // The mobile token powers sleep data. Failure here is non-fatal — it is
    // re-attempted lazily on the first sleep fetch.
    let mobileToken: string | undefined;
    try {
      mobileToken = await corosMobileLogin(email, pwdHash, region);
    } catch (error) {
      console.error("COROS mobile login failed (will retry on sleep fetch):", error);
    }

    const user = await getCurrentUser(req);
    await saveCorosAccount({
      userId: user.id,
      email,
      pwdHash,
      region,
      accessToken: web.accessToken,
      corosUserId: web.userId,
      mobileToken,
    });

    const session = await createSession(user.id);
    const res = NextResponse.json({
      connected: true,
      account: email,
      region,
      sleepReady: Boolean(mobileToken),
    });
    res.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt));
    return res;
  } catch (error) {
    if (error instanceof CorosApiError) {
      return NextResponse.json(
        { error: `COROS sign-in failed: ${error.message}` },
        { status: 401 }
      );
    }
    console.error("COROS login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const account = await prisma.connectedAccount.findUnique({
      where: { userId_provider: { userId: user.id, provider: "coros" } },
    });

    let accountEmail: string | null = null;
    if (account?.refreshToken) {
      try {
        accountEmail = JSON.parse(account.refreshToken).email ?? null;
      } catch {
        // ignore unreadable secrets — still report as connected
      }
    }

    return NextResponse.json({
      connected: Boolean(account),
      account: accountEmail,
      envCredentialsAvailable: Boolean(
        process.env.COROS_EMAIL &&
          process.env.COROS_PASSWORD &&
          !process.env.COROS_EMAIL.startsWith("your_")
      ),
    });
  } catch (error) {
    console.error("COROS status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    await prisma.connectedAccount.deleteMany({
      where: { userId: user.id, provider: "coros" },
    });
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    console.error("COROS disconnect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
