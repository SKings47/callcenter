"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex";

type AgentInfo = {
  _id: string;
  name: string;
  email: string;
  role: "agent" | "supervisor" | "admin";
  status: "available" | "busy" | "offline";
  skillTags: string[];
};

type AuthContextValue = {
  agent: AgentInfo | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: "agent" | "supervisor" | "admin", skillTags: string[]) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("callcenter_token");
    if (stored) setToken(stored);
    setInitialized(true);
  }, []);

  const agent = useQuery(
    api.auth.getMe,
    token ? { token } : "skip",
  );
  const loginMutation = useMutation(api.auth.login);
  const signupMutation = useMutation(api.auth.signup);
  const logoutMutation = useMutation(api.auth.logout);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginMutation({ email, password });
    localStorage.setItem("callcenter_token", result.token);
    setToken(result.token);
  }, [loginMutation]);

  const signup = useCallback(async (
    name: string,
    email: string,
    password: string,
    role: "agent" | "supervisor" | "admin",
    skillTags: string[],
  ) => {
    const result = await signupMutation({ name, email, password, role, skillTags });
    localStorage.setItem("callcenter_token", result.token);
    setToken(result.token);
  }, [signupMutation]);

  const logout = useCallback(async () => {
    if (token) await logoutMutation({ token });
    localStorage.removeItem("callcenter_token");
    setToken(null);
  }, [token, logoutMutation]);

  if (!initialized) {
    return <div className="flex h-screen items-center justify-center bg-background"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <AuthContext.Provider value={{ agent: agent ?? null, token, login, signup, logout, loading: !agent && token !== null }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
