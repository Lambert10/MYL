import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiPost } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("myl_access_token") || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const rawUser = localStorage.getItem("myl_user");
    if (rawUser) {
      try {
        setUser(JSON.parse(rawUser));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (token) localStorage.setItem("myl_access_token", token);
    else localStorage.removeItem("myl_access_token");
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("myl_user", JSON.stringify(user));
    else localStorage.removeItem("myl_user");
  }, [user]);

  async function login({ email, password }) {
    const data = await apiPost("api/auth/login", { email, password });
    if (!data?.token || !data?.user) throw new Error("Respuesta inválida del servidor (login).");
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register({ email, password, name }) {
    const data = await apiPost("api/auth/register", { email, password, name });
    if (!data?.token || !data?.user) throw new Error("Respuesta inválida del servidor (register).");
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    setToken("");
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!token,
      isAdmin: user?.role === "admin",
      login,
      register,
      logout,
      setUser,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider/>");
  return ctx;
}
