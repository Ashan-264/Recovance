// Server-side COROS client.
//
// COROS has no public OAuth API, so this signs in with account credentials the
// same way the COROS app does. The protocol (endpoints, MD5 password hash,
// AES-encrypted mobile login) is ported from the community coros-mcp project:
// https://github.com/cygnusb/coros-mcp
//
// Two separate APIs are involved:
//   - Training Hub web API (team*api.coros.com): daily HRV / resting HR
//   - Mobile app API (api*.coros.com): sleep stage data

import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { getCurrentUser } from "./session";

export type CorosRegion = "us" | "eu" | "asia";

const WEB_BASE: Record<CorosRegion, string> = {
  us: "https://teamapi.coros.com",
  eu: "https://teameuapi.coros.com",
  asia: "https://teamcnapi.coros.com",
};

const MOBILE_BASE: Record<CorosRegion, string> = {
  us: "https://api.coros.com",
  eu: "https://apieu.coros.com",
  asia: "https://apicn.coros.com",
};

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";

// AES IV hardcoded in the COROS app's libencrypt-lib.so
const MOBILE_AES_IV = "weloop3_2015_03#";

// COROS web tokens stop working after ~24 hours; re-login before that.
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const FETCH_TIMEOUT_MS = 30_000;

export class CorosUnavailableError extends Error {
  status: number;
  constructor(message: string, status = 503) {
    super(message);
    this.status = status;
  }
}

export class CorosApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function md5(value: string): string {
  return createHash("md5").update(value).digest("hex");
}

function checkResponse(body: { result?: unknown; message?: unknown }, context: string): void {
  if (body.result !== "0000") {
    throw new CorosApiError(
      String(body.result),
      `COROS ${context} error: ${body.message ?? "unknown error"} (result=${body.result})`
    );
  }
}

function normalizeRegion(value: string | undefined | null): CorosRegion {
  return value === "eu" || value === "asia" ? value : "us";
}

async function corosFetch(url: string, init: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new CorosApiError(String(res.status), `COROS request failed with HTTP ${res.status}`);
  }
  return res.json();
}

// ── Login ─────────────────────────────────────────────────────────────────

export interface CorosWebLogin {
  accessToken: string;
  userId: string;
}

/** Training Hub login. `pwdHash` is md5(password) — never the raw password. */
export async function corosWebLogin(
  email: string,
  pwdHash: string,
  region: CorosRegion
): Promise<CorosWebLogin> {
  const body = await corosFetch(`${WEB_BASE[region]}/account/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
    body: JSON.stringify({ account: email, accountType: 2, pwd: pwdHash }),
  });
  checkResponse(body, "login");
  const data = (body as { data?: { accessToken?: string; userId?: string } }).data;
  if (!data?.accessToken) {
    throw new CorosApiError("no_token", "No accessToken in COROS login response");
  }
  return { accessToken: data.accessToken, userId: String(data.userId ?? "") };
}

/**
 * Encrypt a credential string for the mobile login API:
 * XOR with the appKey, AES-128-CBC (key = appKey), base64.
 */
function mobileEncrypt(plaintext: string, appKey: string): string {
  const key = Buffer.from(appKey, "ascii");
  const data = Buffer.from(plaintext, "utf8");
  const xored = Buffer.from(data.map((b, i) => b ^ key[i % key.length]));
  const cipher = createCipheriv("aes-128-cbc", key, Buffer.from(MOBILE_AES_IV, "ascii"));
  return Buffer.concat([cipher.update(xored), cipher.final()]).toString("base64");
}

/** Mobile app login — required for sleep data. Returns the mobile accessToken. */
export async function corosMobileLogin(
  email: string,
  pwdHash: string,
  region: CorosRegion
): Promise<string> {
  // 16-digit numeric app key doubles as the AES-128 key.
  const appKey = Array.from(randomBytes(16))
    .map((b, i) => (i === 0 ? (b % 9) + 1 : b % 10))
    .join("");

  const payload = {
    account: mobileEncrypt(email, appKey) + "\n",
    accountType: 2,
    appKey,
    clientType: 1,
    hasHrCalibrated: 0,
    kbValidity: 0,
    pwd: mobileEncrypt(pwdHash, appKey) + "\n",
    // Device SIM/locale telemetry from a captured app login; not validated
    // against the account region (routing happens via the base URL).
    region: "310|Europe/Berlin|US",
    skipValidation: false,
  };

  // Android device fingerprint captured from a real COROS app login.
  const yfheader = JSON.stringify({
    appVersion: 1125917087236096,
    clientType: 1,
    language: "en-US",
    mobileName: "sdk_gphone64_arm64,google,Google",
    releaseType: 1,
    systemVersion: "13",
    timezone: 4,
    versionCode: "404080400",
  });

  const body = await corosFetch(`${MOBILE_BASE[region]}/coros/user/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "okhttp/4.12.0",
      "request-time": String(Date.now()),
      yfheader,
    },
    body: JSON.stringify(payload),
  });
  checkResponse(body, "mobile login");
  const token = (body as { data?: { accessToken?: string } }).data?.accessToken;
  if (!token) {
    throw new CorosApiError("no_token", "No accessToken in COROS mobile login response");
  }
  return token;
}

// ── Stored connection ─────────────────────────────────────────────────────

/**
 * Secrets kept in ConnectedAccount.refreshToken (JSON). The md5 password hash
 * is stored instead of the password so the 24-hour web token and the mobile
 * token can both be re-minted without asking the user to sign in again.
 */
interface CorosSecrets {
  email: string;
  pwdHash: string;
  region: CorosRegion;
  mobileToken?: string;
}

export interface CorosAuth {
  accessToken: string;
  corosUserId: string;
  secrets: CorosSecrets;
  /** ConnectedAccount row backing this auth; null when env-only. */
  accountId: string | null;
  userId: string;
}

export async function saveCorosAccount(params: {
  userId: string;
  email: string;
  pwdHash: string;
  region: CorosRegion;
  accessToken: string;
  corosUserId: string;
  mobileToken?: string;
}) {
  const secrets: CorosSecrets = {
    email: params.email,
    pwdHash: params.pwdHash,
    region: params.region,
    mobileToken: params.mobileToken,
  };
  const data = {
    accessToken: params.accessToken,
    refreshToken: JSON.stringify(secrets),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    scope: null,
    providerAccountId: params.corosUserId || params.email,
  };
  return prisma.connectedAccount.upsert({
    where: { userId_provider: { userId: params.userId, provider: "coros" } },
    create: { userId: params.userId, provider: "coros", ...data },
    update: data,
  });
}

async function persistSecrets(auth: CorosAuth): Promise<void> {
  if (!auth.accountId) return;
  await prisma.connectedAccount.update({
    where: { id: auth.accountId },
    data: {
      accessToken: auth.accessToken,
      refreshToken: JSON.stringify(auth.secrets),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });
}

function envCredentials(): { email: string; password: string; region: CorosRegion } | null {
  const email = process.env.COROS_EMAIL;
  const password = process.env.COROS_PASSWORD;
  if (!email || !password || email.startsWith("your_") || password.startsWith("your_")) {
    return null;
  }
  return { email, password, region: normalizeRegion(process.env.COROS_REGION) };
}

/**
 * Resolves a working COROS connection for the request's user.
 *
 * Uses the stored connection (re-logging in when the 24h token has expired),
 * falling back to COROS_EMAIL/COROS_PASSWORD env credentials, which are then
 * persisted as a connection so later requests skip the login.
 */
export async function getCorosAuth(req: NextRequest): Promise<CorosAuth> {
  const user = await getCurrentUser(req);
  const account = await prisma.connectedAccount.findUnique({
    where: { userId_provider: { userId: user.id, provider: "coros" } },
  });

  if (account?.refreshToken) {
    let secrets: CorosSecrets;
    try {
      secrets = JSON.parse(account.refreshToken);
    } catch {
      throw new CorosUnavailableError(
        "Stored COROS connection is unreadable. Reconnect COROS at /connect."
      );
    }

    const expired = !account.expiresAt || account.expiresAt.getTime() <= Date.now();
    let accessToken = account.accessToken;
    let corosUserId = account.providerAccountId;

    if (expired) {
      const fresh = await corosWebLogin(secrets.email, secrets.pwdHash, secrets.region);
      accessToken = fresh.accessToken;
      corosUserId = fresh.userId || corosUserId;
      await prisma.connectedAccount.update({
        where: { id: account.id },
        data: {
          accessToken,
          expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
          providerAccountId: corosUserId,
        },
      });
    }

    return {
      accessToken,
      corosUserId,
      secrets,
      accountId: account.id,
      userId: user.id,
    };
  }

  const env = envCredentials();
  if (env) {
    const pwdHash = md5(env.password);
    const fresh = await corosWebLogin(env.email, pwdHash, env.region);
    const saved = await saveCorosAccount({
      userId: user.id,
      email: env.email,
      pwdHash,
      region: env.region,
      accessToken: fresh.accessToken,
      corosUserId: fresh.userId,
    });
    return {
      accessToken: fresh.accessToken,
      corosUserId: fresh.userId,
      secrets: { email: env.email, pwdHash, region: env.region },
      accountId: saved.id,
      userId: user.id,
    };
  }

  throw new CorosUnavailableError(
    "No COROS connection. Connect COROS at /connect or set COROS_EMAIL and COROS_PASSWORD."
  );
}

/** md5 helper exposed for the login route. */
export function hashCorosPassword(password: string): string {
  return md5(password);
}

// ── Data fetching ─────────────────────────────────────────────────────────

export interface CorosSleepNight {
  /** YYYY-MM-DD */
  day: string;
  totalMinutes: number | null;
  deepMinutes: number | null;
  lightMinutes: number | null;
  remMinutes: number | null;
  awakeMinutes: number | null;
  avgHeartRate: number | null;
  minHeartRate: number | null;
  /** COROS sleep quality 0-100, when present */
  score: number | null;
}

export interface CorosDailyMetrics {
  /** YYYY-MM-DD */
  day: string;
  avgSleepHrv: number | null;
  restingHeartRate: number | null;
}

function formatHappenDay(value: unknown): string | null {
  const digits = String(value ?? "");
  if (!/^\d{8}$/.test(digits)) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

/** "YYYY-MM-DD" → "YYYYMMDD" */
function toHappenDay(date: string): string {
  return date.replaceAll("-", "");
}

/**
 * Sleep stages from the mobile API. Obtains a mobile token lazily and retries
 * once through a fresh mobile login when the token is rejected (result 1019).
 */
export async function fetchCorosSleep(
  auth: CorosAuth,
  startDate: string,
  endDate: string
): Promise<CorosSleepNight[]> {
  const { secrets } = auth;

  const ensureMobileToken = async (): Promise<string> => {
    if (secrets.mobileToken) return secrets.mobileToken;
    secrets.mobileToken = await corosMobileLogin(secrets.email, secrets.pwdHash, secrets.region);
    await persistSecrets(auth);
    return secrets.mobileToken;
  };

  const request = async (token: string) =>
    corosFetch(
      `${MOBILE_BASE[secrets.region]}/coros/data/statistic/daily?accessToken=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", accesstoken: token },
        body: JSON.stringify({
          allDeviceSleep: 1,
          dataType: [5],
          dataVersion: 0,
          startTime: Number(toHappenDay(startDate)),
          endTime: Number(toHappenDay(endDate)),
          statisticType: 1,
        }),
      }
    );

  let body = await request(await ensureMobileToken());
  if ((body as { result?: string }).result === "1019") {
    secrets.mobileToken = await corosMobileLogin(secrets.email, secrets.pwdHash, secrets.region);
    await persistSecrets(auth);
    body = await request(secrets.mobileToken);
  }
  checkResponse(body, "sleep");

  const days =
    (body as {
      data?: { statisticData?: { dayDataList?: Record<string, unknown>[] } };
    }).data?.statisticData?.dayDataList ?? [];

  const nights: CorosSleepNight[] = [];
  for (const item of days) {
    const day = formatHappenDay(item.happenDay);
    if (!day) continue;
    const sd = (item.sleepData ?? {}) as Record<string, number | null | undefined>;
    const performance = item.performance as number | undefined;
    nights.push({
      day,
      totalMinutes: sd.totalSleepTime ?? null,
      deepMinutes: sd.deepTime ?? null,
      lightMinutes: sd.lightTime ?? null,
      remMinutes: sd.eyeTime ?? null,
      awakeMinutes: sd.wakeTime ?? null,
      avgHeartRate: sd.avgHeartRate ?? null,
      minHeartRate: sd.minHeartRate ?? null,
      score: performance != null && performance !== -1 ? performance : null,
    });
  }
  return nights.sort((a, b) => a.day.localeCompare(b.day));
}

/** Nightly HRV and resting HR from the Training Hub web API (up to ~24 weeks). */
export async function fetchCorosDaily(
  auth: CorosAuth,
  startDate: string,
  endDate: string
): Promise<CorosDailyMetrics[]> {
  const url = new URL(`${WEB_BASE[auth.secrets.region]}/analyse/dayDetail/query`);
  url.searchParams.set("startDay", toHappenDay(startDate));
  url.searchParams.set("endDay", toHappenDay(endDate));

  const body = await corosFetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      accessToken: auth.accessToken,
      yfheader: JSON.stringify({ userId: auth.corosUserId }),
    },
  });
  checkResponse(body, "analyse");

  const days = (body as { data?: { dayList?: Record<string, unknown>[] } }).data?.dayList ?? [];
  const records: CorosDailyMetrics[] = [];
  for (const item of days) {
    const day = formatHappenDay(item.happenDay);
    if (!day) continue;
    records.push({
      day,
      avgSleepHrv: (item.avgSleepHrv as number | undefined) ?? null,
      restingHeartRate: (item.rhr as number | undefined) ?? null,
    });
  }
  return records.sort((a, b) => a.day.localeCompare(b.day));
}
