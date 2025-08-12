import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/api";

const AuthCtx = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);     // <-- no hardcoded demo user
  const [loading, setLoading] = useState(true);

  // hydrate user from token on app start
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
      } catch {
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signin = async (email, password) => {
    const { data } = await api.post("/auth/signin", { email, password });
    localStorage.setItem("token", data.token);
    setUser(data.user);
  };

  const signup = async (name, email, password) => {
    const { data } = await api.post("/auth/signup", { name, email, password });
    localStorage.setItem("token", data.token);
    setUser(data.user);
  };

  const signout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, signin, signup, signout }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
