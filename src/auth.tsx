import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, call, currentRefreshToken, onSessionChange, setSession } from "./api";
import type { components } from "./api-types";

export type Me = components["schemas"]["Me"];

type Auth = {
  me: Me | null;
  can: (permission: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (tenantName: string, email: string, password: string, locale: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const qc = useQueryClient();

  // Session dropped (refresh failed): clear the user and any cached data.
  useEffect(
    () =>
      onSessionChange(() => {
        if (!currentRefreshToken()) {
          setMe(null);
          qc.clear();
        }
      }),
    [qc],
  );

  const start = useCallback(async (t: components["schemas"]["Tokens"]) => {
    setSession({ access: t.accessToken, refresh: t.refreshToken });
    try {
      setMe(await call(api.GET("/me")));
    } catch (e) {
      setSession(null); // never keep tokens for a user we could not load
      throw e;
    }
  }, []);

  const value: Auth = {
    me,
    can: (p) => me?.permissions.includes(p) ?? false,
    login: async (email, password) => start(await call(api.POST("/auth/login", { body: { email, password } }))),
    register: async (tenantName, email, password, locale) =>
      start(await call(api.POST("/auth/register", { body: { tenantName, email, password, locale } }))),
    logout: async () => {
      const refreshToken = currentRefreshToken();
      setSession(null); // listener clears the user and the cache right away
      if (refreshToken) void api.POST("/auth/logout", { body: { refreshToken } }).catch(() => undefined); // revoke server-side, best effort
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): Auth {
  const c = useContext(Ctx);
  if (!c) throw new Error("AuthProvider missing");
  return c;
}
