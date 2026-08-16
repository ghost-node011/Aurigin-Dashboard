import { createContext, useContext, useEffect, useState } from "react";
import { api, TOKEN_KEY } from "../lib/api";

const AuthContext = createContext(null);

// Owns the JWT and resolves "who am I" by calling the API directly — this
// runs above HRDataProvider (see App.jsx) so the token exists before
// HRDataProvider tries to fetch anything that needs it.
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      setAuthLoading(false);
      return;
    }
    setAuthLoading(true);
    api
      .me()
      .then(setCurrentUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setCurrentUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, [token]);

  async function login(email, password) {
    const { token: newToken, employee } = await api.login(email, password);
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setCurrentUser(employee);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCurrentUser(null);
  }

  async function refreshCurrentUser() {
    const employee = await api.me();
    setCurrentUser(employee);
    return employee;
  }

  return (
    <AuthContext.Provider value={{ currentUser, authLoading, login, logout, refreshCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
