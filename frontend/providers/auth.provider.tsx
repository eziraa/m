"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { 
  useVerifyTelegramMutation, 
  useLoginLocalMutation, 
  useSignupLocalMutation 
} from "@/lib/api";
import {
  initTelegramWebApp,
  getTelegramInitData,
  getTelegramStartParam,
} from "@/lib/telegram";

const FALLBACK_TOKEN_KEY = "mella_token";

export type AuthUser = {
  id?: string;
  username?: string;
  role?: string;
};

export type AuthStatus = "boot" | "authenticated" | "unauthenticated" | "error";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  error: string | null;
  login: (input: any) => Promise<void>;
  signup: (input: any) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeToken(token: string): AuthUser | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return null;

    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as {
      sub?: unknown;
      username?: unknown;
      role?: unknown;
    };

    return {
      id: typeof payload.sub === "string" ? payload.sub : undefined,
      username:
        typeof payload.username === "string" ? payload.username : undefined,
      role: typeof payload.role === "string" ? payload.role : undefined,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("boot");
  const [error, setError] = useState<string | null>(null);

  const verifyTelegramMutation = useVerifyTelegramMutation();
  const loginMutation = useLoginLocalMutation();
  const signupMutation = useSignupLocalMutation();

  const handleAuthSuccess = useCallback((newToken: string) => {
    localStorage.setItem(FALLBACK_TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(decodeToken(newToken));
    setStatus("authenticated");
    setError(null);
  }, []);

  const login = async (input: any) => {
    try {
      const newToken = await loginMutation.mutateAsync(input);
      handleAuthSuccess(newToken);
    } catch (err) {
      setError("local_login_failed");
      throw err;
    }
  };

  const signup = async (input: any) => {
    try {
      const newToken = await signupMutation.mutateAsync(input);
      handleAuthSuccess(newToken);
    } catch (err) {
      setError("local_signup_failed");
      throw err;
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem(FALLBACK_TOKEN_KEY);
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    async function boot() {
      try {
        initTelegramWebApp();
        const initData = getTelegramInitData();
        const startParam = getTelegramStartParam();
        const stored = localStorage.getItem(FALLBACK_TOKEN_KEY);

        if (!initData && !stored) {
          setStatus("unauthenticated");
          return;
        }

        const activeToken = initData
          ? await verifyTelegramMutation.mutateAsync({
              initData,
              startParam: startParam || undefined,
            })
          : stored;

        if (!activeToken) {
          setStatus("unauthenticated");
          return;
        }

        handleAuthSuccess(activeToken);
      } catch (err) {
        console.error("Auth boot failed:", err);
        setStatus("error");
        setError(err instanceof Error ? err.message : "boot_failed");
      }
    }

    boot();
  }, [handleAuthSuccess, verifyTelegramMutation.mutateAsync]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        status,
        error,
        login,
        signup,
        logout,
        isLoading: status === "boot",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
