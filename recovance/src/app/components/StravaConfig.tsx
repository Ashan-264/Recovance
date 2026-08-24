"use client";

import React, { useState } from "react";
import { useStrava } from "@/app/contexts/StravaContext";

/**
 * Strava status line with the legacy manual-token panel tucked behind it.
 *
 * The Connect page's OAuth flow is the recommended path, so this renders as a
 * single quiet row; pasting a token by hand is still possible but lives in the
 * collapsed section where it cannot dominate every page.
 */
export default function StravaConfig() {
  const { stravaToken, setStravaToken, getStravaToken, hasValidToken } =
    useStrava();
  const [tempToken, setTempToken] = useState("");

  const handleSaveToken = () => {
    setStravaToken(tempToken);
    setTempToken("");
  };

  const handleClearToken = () => {
    setStravaToken("");
    setTempToken("");
  };

  const currentToken = getStravaToken();
  const tokenSource = stravaToken
    ? "manually saved token"
    : currentToken === process.env.NEXT_PUBLIC_STRAVA_API_TOKEN && currentToken
    ? "environment variable"
    : "Connect page";

  return (
    <details className="bg-[#1e2a28] px-4 py-3 rounded-lg border border-[#3b5450] mb-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[#9cbab5]">
          Strava:{" "}
          {hasValidToken ? (
            <>
              <span className="text-green-400">connected</span>
              <span className="text-[#7f9d98]"> · via {tokenSource}</span>
            </>
          ) : (
            <>
              <span className="text-red-400">not connected</span>
              <span className="text-[#7f9d98]"> — link your account on </span>
              <a href="/connect" className="text-[#0cf2d0] underline">
                Connect
              </a>
            </>
          )}
        </span>
        <span className="shrink-0 text-xs text-[#7f9d98]">
          manual token options ▾
        </span>
      </summary>

      <div className="mt-3 space-y-4 border-t border-[#3b5450] pt-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-white">
            Paste an access token (fallback):
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="Strava access token"
              className="flex-1 rounded-md border border-[#3b5450] bg-[#283937] p-2 text-sm text-white"
              value={tempToken}
              onChange={(event) => setTempToken(event.target.value)}
            />
            <button
              onClick={handleSaveToken}
              disabled={!tempToken.trim()}
              className="rounded-lg bg-[#0cf2d0] px-4 py-2 text-sm font-bold text-[#111817] transition hover:bg-[#0ad4b8] disabled:opacity-50"
            >
              Save
            </button>
          </div>
          <p className="mt-2 text-xs text-[#7f9d98]">
            Tokens pasted from strava.com/settings/api carry only the
            &quot;read&quot; scope and expire in six hours — the Connect page
            grants full access with automatic refresh.
          </p>
        </div>

        {stravaToken && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-green-400">
              ✓ Manual token saved in this browser
            </p>
            <button
              onClick={handleClearToken}
              className="rounded bg-red-600 px-3 py-1 text-sm text-white transition hover:bg-red-700"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </details>
  );
}
