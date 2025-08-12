"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

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

  // Load token from localStorage on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedToken = localStorage.getItem("strava_token");
      if (savedToken) {
        setStravaTokenState(savedToken);
      }
    }
  }, []);

  // Save token to localStorage whenever it changes
  const setStravaToken = (token: string) => {
    setStravaTokenState(token);
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("strava_token", token);
      } else {
        localStorage.removeItem("strava_token");
      }
    }
  };

  // Get the best available token (user input > localStorage > environment variable)
  const getStravaToken = (): string => {
    if (stravaToken) {
      return stravaToken;
    }

    if (typeof window !== "undefined") {
      const savedToken = localStorage.getItem("strava_token");
      if (savedToken) {
        return savedToken;
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
