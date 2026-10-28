import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (!getToken()) {
        setReady(true);
        return;
      }
      try {
        const data = await api("/api/auth/me");
        setUser(data.user);
      } catch {
        setToken(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      async login(email, password) {
        const data = await api("/api/auth/login", { method: "POST", body: { email, password } });
        setToken(data.token);
        setUser(data.user);
      },
      async register(payload) {
        const data = await api("/api/auth/register", { method: "POST", body: payload });
        setToken(data.token);
        setUser(data.user);
      },
      logout() {
        setToken(null);
        setUser(null);
      },
    }),
    [user, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
