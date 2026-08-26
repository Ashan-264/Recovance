"use client";

import React, { useCallback, useEffect, useState } from "react";
import Header from "@/app/components/Header";
import ActivityDataUpload from "@/app/components/ActivityDataUpload";
import SleepDataUpload from "@/app/components/SleepDataUpload";
import {
  clearTokens,
  loadTokens,
  ProviderName,
  StoredTokens,
  TOKENS_UPDATED_EVENT,
  refreshTokens,
  saveTokens,
} from "@/lib/oauthClient";

const PROVIDERS: {
  name: ProviderName;
  displayName: string;
  description: string;
}[] = [
  {
    name: "strava",
    displayName: "Strava",
    description: "Activities, training load, and athlete stats",
  },
  {
    name: "oura",
    displayName: "Oura",
    description: "Sleep, readiness, HRV, and stress data",
  },
  {
    name: "whoop",
    displayName: "WHOOP",
    description: "Recovery, strain, and sleep performance",
  },
];

function formatExpiry(expiresAt?: number): string | null {
  if (!expiresAt) {
    return null;
  }
  const date = new Date(expiresAt * 1000);
  return expiresAt * 1000 > Date.now()
    ? `Token valid until ${date.toLocaleString()}`
    : `Token expired ${date.toLocaleString()}`;
}

interface ProviderStatus {
  name: ProviderName;
  displayName: string;
  configured: boolean;
  clientIdEnv: string;
  clientSecretEnv: string;
}

interface CorosStatus {
  connected: boolean;
  account: string | null;
  envCredentialsAvailable: boolean;
}

export default function ConnectPage() {
  const [tokens, setTokens] = useState<
    Partial<Record<ProviderName, StoredTokens | null>>
  >({});
  const [status, setStatus] = useState<
    Partial<Record<ProviderName, ProviderStatus>>
  >({});
  const [ouraServerToken, setOuraServerToken] = useState(false);
  const [origin, setOrigin] = useState("");
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  // COROS signs in with account credentials (no OAuth API exists), so its
  // connection state lives server-side rather than in localStorage.
  const [coros, setCoros] = useState<CorosStatus | null>(null);
  const [corosEmail, setCorosEmail] = useState("");
  const [corosPassword, setCorosPassword] = useState("");
  const [corosRegion, setCorosRegion] = useState("us");
  const [corosBusy, setCorosBusy] = useState(false);

  const loadCorosStatus = useCallback(() => {
    fetch("/api/auth/coros/login")
      .then((res) => res.json())
      .then((data) => setCoros(data))
      .catch((err) => console.error("Failed to load COROS status:", err));
  }, []);

  useEffect(() => {
    loadCorosStatus();
  }, [loadCorosStatus]);

  const handleCorosConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setCorosBusy(true);
    try {
      const res = await fetch("/api/auth/coros/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: corosEmail,
          password: corosPassword,
          region: corosRegion,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ kind: "success", text: "Connected to COROS successfully." });
        setCorosPassword("");
        loadCorosStatus();
      } else {
        setMessage({ kind: "error", text: data.error || "COROS sign-in failed." });
      }
    } catch (err) {
      console.error(err);
      setMessage({ kind: "error", text: "COROS sign-in failed." });
    } finally {
      setCorosBusy(false);
    }
  };

  const handleCorosDisconnect = async () => {
    try {
      await fetch("/api/auth/coros/login", { method: "DELETE" });
      setMessage({ kind: "success", text: "Disconnected from COROS." });
      loadCorosStatus();
    } catch (err) {
      console.error(err);
      setMessage({ kind: "error", text: "Could not disconnect COROS." });
    }
  };

  const reloadTokens = useCallback(() => {
    setTokens({
      strava: loadTokens("strava"),
      oura: loadTokens("oura"),
      whoop: loadTokens("whoop"),
    });
  }, []);

  // Handle the OAuth callback redirect: tokens arrive in the URL hash,
  // errors in the query string.
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const queryParams = new URLSearchParams(window.location.search);
    const hashProvider = hashParams.get("provider") as ProviderName | null;
    const accessToken = hashParams.get("access_token");

    if (hashProvider && accessToken) {
      saveTokens(hashProvider, {
        accessToken,
        refreshToken: hashParams.get("refresh_token") || undefined,
        expiresAt: hashParams.get("expires_at")
          ? parseInt(hashParams.get("expires_at")!, 10)
          : undefined,
        account: hashParams.get("account") || undefined,
      });
      setMessage({
        kind: "success",
        text: `Connected to ${hashProvider} successfully.`,
      });
      window.history.replaceState(null, "", window.location.pathname);
    } else if (queryParams.get("error")) {
      setMessage({
        kind: "error",
        text: `${queryParams.get("provider") || "OAuth"}: ${queryParams.get(
          "error"
        )}`,
      });
      window.history.replaceState(null, "", window.location.pathname);
    }

    reloadTokens();
  }, [reloadTokens]);

  useEffect(() => {
    window.addEventListener(TOKENS_UPDATED_EVENT, reloadTokens);
    return () => window.removeEventListener(TOKENS_UPDATED_EVENT, reloadTokens);
  }, [reloadTokens]);

  // Find out which providers actually have server-side OAuth credentials
  useEffect(() => {
    setOrigin(window.location.origin);

    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => {
        const byName: Partial<Record<ProviderName, ProviderStatus>> = {};
        (data.providers as ProviderStatus[]).forEach((p) => {
          byName[p.name] = p;
        });
        setStatus(byName);
        setOuraServerToken(Boolean(data.ouraServerTokenAvailable));
      })
      .catch((err) => console.error("Failed to load provider status:", err));
  }, []);

  const handleDisconnect = (provider: ProviderName) => {
    clearTokens(provider);
    setMessage({ kind: "success", text: `Disconnected from ${provider}.` });
  };

  const handleRefresh = async (provider: ProviderName) => {
    const refreshed = await refreshTokens(provider);
    setMessage(
      refreshed
        ? { kind: "success", text: `Refreshed ${provider} token.` }
        : { kind: "error", text: `Could not refresh ${provider} token.` }
    );
  };

  return (
    <div className="min-h-screen bg-[#111817] text-white">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-[32px] font-bold leading-tight text-white">
          Connected Services
        </h1>
        <p className="mt-2 text-sm text-[#9cbab5]">
          Link your devices and platforms so Recovance can analyze your
          training and recovery data.
        </p>

        {message && (
          <div
            className={`mt-6 rounded-lg border p-3 text-sm ${
              message.kind === "success"
                ? "border-green-600/40 bg-green-900/20 text-green-400"
                : "border-red-600/40 bg-red-900/20 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-8 space-y-4">
          {PROVIDERS.map((provider) => {
            const stored = tokens[provider.name];
            const connected = Boolean(stored?.accessToken);
            const expiry = stored ? formatExpiry(stored.expiresAt) : null;
            const providerStatus = status[provider.name];
            // Treat as configured until the status check answers, so the
            // button does not flicker into "Setup required" on first paint.
            const configured = providerStatus?.configured ?? true;

            return (
              <div
                key={provider.name}
                className="rounded-lg border border-[#3b5450] bg-[#1e2a28] p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold">
                      {provider.displayName}
                      {stored?.account ? (
                        <span className="ml-2 text-sm font-normal text-[#9cbab5]">
                          ({stored.account})
                        </span>
                      ) : null}
                    </h2>
                    <p className="text-sm text-[#9cbab5]">
                      {provider.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-semibold ${
                        connected
                          ? "text-green-400"
                          : configured
                          ? "text-gray-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {connected
                        ? "● Connected"
                        : configured
                        ? "○ Not connected"
                        : "○ Setup required"}
                    </span>
                    {connected ? (
                      <>
                        {stored?.refreshToken && (
                          <button
                            onClick={() => handleRefresh(provider.name)}
                            className="rounded-lg border border-[#3b5450] bg-[#283937] px-4 py-2 text-sm font-bold hover:bg-[#36514e] transition"
                          >
                            Refresh
                          </button>
                        )}
                        <button
                          onClick={() => handleDisconnect(provider.name)}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold hover:bg-red-700 transition"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : configured ? (
                      <a
                        href={`/api/auth/${provider.name}/login`}
                        className="rounded-lg bg-[#0cf2d0] px-4 py-2 text-sm font-bold text-[#111817] hover:bg-[#0ad4b8] transition"
                      >
                        Connect
                      </a>
                    ) : (
                      <span
                        className="cursor-not-allowed rounded-lg bg-[#283937] px-4 py-2 text-sm font-bold text-gray-500"
                        title={`Set ${providerStatus?.clientIdEnv} and ${providerStatus?.clientSecretEnv} in .env.local`}
                      >
                        Connect
                      </span>
                    )}
                  </div>
                </div>
                {connected && expiry && (
                  <p className="mt-3 text-xs text-[#9cbab5]">{expiry}</p>
                )}
                {!connected && !configured && providerStatus && (
                  <p className="mt-3 text-xs text-yellow-400/90">
                    To enable this connection, register an app with{" "}
                    {provider.displayName} using the redirect URI{" "}
                    <code className="text-yellow-300">
                      {origin}/api/auth/{provider.name}/callback
                    </code>
                    , then set{" "}
                    <code className="text-yellow-300">
                      {providerStatus.clientIdEnv}
                    </code>{" "}
                    and{" "}
                    <code className="text-yellow-300">
                      {providerStatus.clientSecretEnv}
                    </code>{" "}
                    in .env.local and restart the server.
                  </p>
                )}
                {!connected &&
                  provider.name === "oura" &&
                  ouraServerToken && (
                    <p className="mt-2 text-xs text-[#9cbab5]">
                      Oura data is already available through the server&apos;s
                      personal access token, so sleep and readiness features
                      work without connecting here.
                    </p>
                  )}
              </div>
            );
          })}
        </div>

        {/* COROS has no OAuth API — it signs in with account credentials and
            replaces Oura sleep metrics (stages, sleep HR, HRV, RHR) where its
            data is available. */}
        <div className="mt-4 rounded-lg border border-[#3b5450] bg-[#1e2a28] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">
                COROS
                {coros?.connected && coros.account ? (
                  <span className="ml-2 text-sm font-normal text-[#9cbab5]">
                    ({coros.account})
                  </span>
                ) : null}
              </h2>
              <p className="text-sm text-[#9cbab5]">
                Sleep stages, sleep heart rate, HRV, and resting HR — used in
                place of Oura where available
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-semibold ${
                  coros?.connected ? "text-green-400" : "text-gray-400"
                }`}
              >
                {coros?.connected ? "● Connected" : "○ Not connected"}
              </span>
              {coros?.connected && (
                <button
                  onClick={handleCorosDisconnect}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold hover:bg-red-700 transition"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {!coros?.connected && (
            <form
              onSubmit={handleCorosConnect}
              className="mt-4 flex flex-wrap items-end gap-3"
            >
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs mb-1 text-[#9cbab5]">
                  COROS account email
                </label>
                <input
                  type="email"
                  required
                  value={corosEmail}
                  onChange={(e) => setCorosEmail(e.target.value)}
                  className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-2 text-white text-sm"
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs mb-1 text-[#9cbab5]">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={corosPassword}
                  onChange={(e) => setCorosPassword(e.target.value)}
                  className="w-full rounded-md bg-[#283937] border border-[#3b5450] p-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-[#9cbab5]">
                  Region
                </label>
                <select
                  value={corosRegion}
                  onChange={(e) => setCorosRegion(e.target.value)}
                  className="rounded-md bg-[#283937] border border-[#3b5450] p-2 text-white text-sm"
                >
                  <option value="us">Americas</option>
                  <option value="eu">Europe</option>
                  <option value="asia">Asia-Pacific</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={corosBusy}
                className="rounded-lg bg-[#0cf2d0] px-4 py-2 text-sm font-bold text-[#111817] hover:bg-[#0ad4b8] transition disabled:opacity-50"
              >
                {corosBusy ? "Signing in…" : "Connect"}
              </button>
            </form>
          )}

          {!coros?.connected && (
            <p className="mt-3 text-xs text-[#9cbab5]">
              COROS does not offer OAuth, so Recovance signs in with your
              account credentials directly. Only a hash of the password is kept
              on the server to refresh tokens — the password itself is never
              stored.
              {coros?.envCredentialsAvailable &&
                " Server-side COROS credentials are configured, so COROS data already works without connecting here."}
            </p>
          )}
        </div>

        {/* Garmin has no OAuth API for this data, so it arrives as CSV
            exports. It lives here with the other connections rather than being
            buried on the training and recovery pages. */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-white">Garmin</h2>
          <p className="mt-1 mb-4 text-sm text-[#9cbab5]">
            Garmin does not expose this data through an API, so export it from
            Garmin Connect and upload the CSVs here. Re-uploading is safe —
            records are matched on date and updated in place, never duplicated.
          </p>
          <ActivityDataUpload />
          <SleepDataUpload />
        </div>

        <div className="mt-10 rounded-lg border border-[#3b5450] bg-[#1e2a28] p-5 text-sm text-[#9cbab5]">
          <h3 className="mb-2 font-bold text-white">How it works</h3>
          <p>
            Connecting redirects you to the provider to authorize Recovance.
            Tokens are stored only in this browser and are sent to the
            provider&apos;s API through Recovance&apos;s server routes. Each
            provider requires its client ID and secret to be configured in the
            server environment — see example.env in the repo.
          </p>
        </div>
      </main>
    </div>
  );
}
