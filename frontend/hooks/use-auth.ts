"use client";

import { useEffect, useMemo, useState } from "react";

type AuthUser = {
  id?: string;
  username?: string;
  role?: string;
};

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
};

const TOKEN_KEY = "mella_token";

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

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    setUser(token ? decodeToken(token) : null);
    setIsLoading(false);
  }, []);

  return useMemo(
    () => ({
      user,
      isLoading,
    }),
    [user, isLoading],
  );
}
