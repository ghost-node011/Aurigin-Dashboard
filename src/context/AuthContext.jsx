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
  const [authError, setAuthError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      setAuthLoading(false);
      return;
    }
    let cancelled = false;
    setAuthLoading(true);
    setAuthError(null);

    // Only a 401 means the session is over, and `request` already clears
    // the token and redirects for that. Anything else (the API cold-starting,
    // a network blip, a timeout) must not log the user out, so it's retried
    // a few times and then offered as "try again" with the token kept.
    (async () => {
      for (let i = 0; i < 3; i++) {
        try {
          const me = await api.me();
          if (!cancelled) setCurrentUser(me);
          return;
        } catch (err) {
          if (!localStorage.getItem(TOKEN_KEY)) return; // 401: token cleared, redirecting
          if (i === 2) {
            if (!cancelled) setAuthError(err.message || "Couldn't reach the server.");
            return;
          }
          await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        }
      }
    })().finally(() => !cancelled && setAuthLoading(false));

    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

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
    <AuthContext.Provider
      value={{ currentUser, authLoading, authError, retryAuth: () => setAttempt((n) => n + 1), login, logout, refreshCurrentUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
