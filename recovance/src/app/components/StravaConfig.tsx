"use client";

import React, { useState } from "react";
import { useStrava } from "@/app/contexts/StravaContext";

export default function StravaConfig() {
  const { stravaToken, setStravaToken, getStravaToken, hasValidToken } =
    useStrava();
  const [showConfig, setShowConfig] = useState(false);
  const [tempToken, setTempToken] = useState("");

  const handleSaveToken = () => {
    setStravaToken(tempToken);
    setTempToken("");
    setShowConfig(false);
  };

  const handleClearToken = () => {
    setStravaToken("");
    setTempToken("");
  };

  const currentToken = getStravaToken();
  const tokenSource = stravaToken
    ? "User Input"
    : currentToken === process.env.NEXT_PUBLIC_STRAVA_API_TOKEN
    ? "Environment Variable"
    : "None";

  return (
    <div className="bg-[#1e2a28] p-4 rounded-lg border border-[#3b5450] mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white">Strava Configuration</h3>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="text-sm px-3 py-1 rounded bg-[#283937] text-white border border-[#3b5450] hover:bg-[#36514e] transition"
        >
          {showConfig ? "Hide" : "Configure"}
        </button>
      </div>

      {/* Status Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-400">Token Status</p>
          <p
            className={`text-sm font-semibold ${
              hasValidToken ? "text-green-400" : "text-red-400"
            }`}
          >
            {hasValidToken ? "✓ Available" : "✗ Missing"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Token Source</p>
          <p className="text-sm font-semibold text-white">{tokenSource}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Token Length</p>
          <p className="text-sm font-semibold text-white">
            {currentToken ? `${currentToken.length} chars` : "0 chars"}
          </p>
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="border-t border-[#3b5450] pt-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-white">
              Strava Access Token:
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Enter your Strava access token"
                className="flex-1 rounded-md bg-[#283937] border border-[#3b5450] p-2 text-white text-sm"
                value={tempToken}
                onChange={(e) => setTempToken(e.target.value)}
              />
              <button
                onClick={handleSaveToken}
                disabled={!tempToken.trim()}
                className="rounded-lg bg-[#0cf2d0] px-4 py-2 text-sm font-bold text-[#111817] hover:bg-[#0ad4b8] transition disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>

          {stravaToken && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-green-400">
                ✓ Custom token saved (will persist across sessions)
              </p>
              <button
                onClick={handleClearToken}
                className="text-sm px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition"
              >
                Clear Saved Token
              </button>
            </div>
          )}

          {!stravaToken && process.env.NEXT_PUBLIC_STRAVA_API_TOKEN && (
            <p className="text-sm text-blue-400">
              ℹ Using environment variable NEXT_PUBLIC_STRAVA_API_TOKEN
            </p>
          )}

          <div className="text-xs text-gray-400 space-y-1">
            <p>• Token will be saved in your browser&apos;s local storage</p>
            <p>
              • Environment variables are used as fallback if no custom token is
              set
            </p>
            <p>
              • This token will be used across all Strava-enabled components
            </p>
          </div>
        </div>
      )}

      {!hasValidToken && (
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3 mt-3">
          <p className="text-sm text-yellow-400">
            ⚠️ No Strava token available. Components requiring Strava data will
            not function properly.
          </p>
        </div>
      )}
    </div>
  );
}
