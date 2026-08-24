import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "recovance_session";
const SESSION_DAYS = 90;

export interface SessionUser {
  id: string;
  email: string | null;
  displayName: string | null;
  isLocal: boolean;
}

/**
 * The single-user fallback.
 *
 * Recovance can run self-hosted with only a server-side Oura personal access
 * token and no OAuth login at all. Rather than making every cache path
 * nullable, those installs are attributed to one durable "local" user.
 */
export async function getLocalUser(): Promise<SessionUser> {
  const existing = await prisma.user.findFirst({ where: { isLocal: true } });

  if (existing) {
    return existing;
  }

  return prisma.user.create({
    data: { isLocal: true, displayName: "Local" },
  });
}

/** Resolves the signed-in user, falling back to the local user. */
export async function getCurrentUser(req: NextRequest): Promise<SessionUser> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (token) {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (session && session.expiresAt > new Date()) {
      return session.user;
    }

    // Expired or unknown token — clean it up and fall through.
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
  }

  return getLocalUser();
}

export async function createSession(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({ data: { token, userId, expiresAt } });

  return { token, expiresAt };
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    expires: expiresAt,
    path: "/",
  };
}
