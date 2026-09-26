import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshUser = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/api/auth/me");
      setUser(data.user || null);
      return data.user || null;
    } catch (requestError) {
      if (requestError.status === 401) {
        setUser(null);
        return null;
      }
      setError(requestError.message);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const authenticate = useCallback(async (path, credentials) => {
    setError("");
    const data = await apiRequest(path, {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    const authenticatedUser = data.user || (await apiRequest("/api/auth/me")).user || null;
    setUser(authenticatedUser);
    return authenticatedUser;
  }, []);

  const register = useCallback(
    (credentials) => authenticate("/api/auth/register", credentials),
    [authenticate],
  );
  const login = useCallback(
    (credentials) => authenticate("/api/auth/login", credentials),
    [authenticate],
  );
  const logout = useCallback(async () => {
    setError("");
    await apiRequest("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, register, login, logout, refreshUser }),
    [user, loading, error, register, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
