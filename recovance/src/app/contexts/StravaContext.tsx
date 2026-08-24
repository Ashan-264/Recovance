"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  isExpired,
  loadTokens,
  refreshTokens,
  saveTokens,
  clearTokens,
  TOKENS_UPDATED_EVENT,
} from "@/lib/oauthClient";

interface StravaContextType {
  stravaToken: string;
  setStravaToken: (token: string) => void;
  getStravaToken: () => string;
  hasValidToken: boolean;
}

const StravaContext = createContext<StravaContextType | undefined>(undefined);

export const useStrava = () => {
  const context = useContext(StravaContext);
  if (context === undefined) {
    throw new Error("useStrava must be used within a StravaProvider");
  }
  return context;
};

interface StravaProviderProps {
  children: ReactNode;
}

export const StravaProvider: React.FC<StravaProviderProps> = ({ children }) => {
  const [stravaToken, setStravaTokenState] = useState<string>("");

  // Load the stored token, refreshing it first when the OAuth flow gave us
  // a refresh token and the access token is expired (Strava tokens last 6h).
  const syncFromStorage = useCallback(async () => {
    const stored = loadTokens("strava");

    if (!stored) {
      setStravaTokenState("");
      return;
    }

    if (isExpired(stored) && stored.refreshToken) {
      const refreshed = await refreshTokens("strava");
      setStravaTokenState(refreshed?.accessToken || stored.accessToken);
      return;
    }

    setStravaTokenState(stored.accessToken);
  }, []);

  useEffect(() => {
    syncFromStorage();

    // Stay in sync when the /connect page saves or clears tokens
    const onTokensUpdated = () => syncFromStorage();
    window.addEventListener(TOKENS_UPDATED_EVENT, onTokensUpdated);
    return () =>
      window.removeEventListener(TOKENS_UPDATED_EVENT, onTokensUpdated);
  }, [syncFromStorage]);

  // Manual token entry (StravaConfig) — no refresh token or known expiry.
  const setStravaToken = (token: string) => {
    setStravaTokenState(token);
    if (typeof window !== "undefined") {
      if (token) {
        saveTokens("strava", { accessToken: token });
      } else {
        clearTokens("strava");
      }
    }
  };

  // Get the best available token (user input / OAuth > environment variable)
  const getStravaToken = (): string => {
    if (stravaToken) {
      return stravaToken;
    }

    if (typeof window !== "undefined") {
      const stored = loadTokens("strava");
      if (stored) {
        return stored.accessToken;
      }
    }

    return process.env.NEXT_PUBLIC_STRAVA_API_TOKEN || "";
  };

  // Check if we have a valid token from any source
  const hasValidToken = (): boolean => {
    const token = getStravaToken();
    return token.length > 0;
  };

  const value: StravaContextType = {
    stravaToken,
    setStravaToken,
    getStravaToken,
    hasValidToken: hasValidToken(),
  };

  return (
    <StravaContext.Provider value={value}>{children}</StravaContext.Provider>
  );
};
