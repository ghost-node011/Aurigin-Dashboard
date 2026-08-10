import { createContext, useContext, useEffect, useState } from "react";
import { useHRData } from "./HRDataContext";

const STORAGE_KEY = "aurigin-hr.currentUserId";

const AuthContext = createContext(null);

// Mounted inside HRDataProvider so "who am I" resolves against the live,
// mutable employee list (HR can add new hires who then need to log in).
export function AuthProvider({ children }) {
  const { getEmployee } = useHRData();
  const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem(STORAGE_KEY));

  useEffect(() => {
    if (currentUserId) localStorage.setItem(STORAGE_KEY, currentUserId);
    else localStorage.removeItem(STORAGE_KEY);
  }, [currentUserId]);

  const currentUser = currentUserId ? getEmployee(currentUserId) : null;

  function login(employeeId) {
    setCurrentUserId(employeeId);
  }

  function logout() {
    setCurrentUserId(null);
  }

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
