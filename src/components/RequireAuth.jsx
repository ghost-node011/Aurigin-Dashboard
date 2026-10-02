import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AuthLoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <img src="/logo-mark.png" alt="" className="h-12 w-12 animate-pulse object-contain" />
    </div>
  );
}

function AuthErrorScreen({ message, onRetry }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <img src="/logo-mark.png" alt="" className="h-12 w-12 object-contain" />
      <p className="text-sm text-muted-foreground">Couldn't reach the server — you're still signed in. {message}</p>
      <button type="button" onClick={onRetry} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
        Try again
      </button>
    </div>
  );
}

export function RequireAuth() {
  const { currentUser, authLoading, authError, retryAuth } = useAuth();
  if (authLoading) return <AuthLoadingScreen />;
  if (authError && !currentUser) return <AuthErrorScreen message={authError} onRetry={retryAuth} />;
  if (!currentUser) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireRole({ roles }) {
  const { currentUser, authLoading } = useAuth();
  if (authLoading) return <AuthLoadingScreen />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!roles.includes(currentUser.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Project managers only — admins, plus anyone granted it on their profile. */
export function RequireProjectManager() {
  const { currentUser, authLoading } = useAuth();
  if (authLoading) return <AuthLoadingScreen />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.role !== "admin" && !currentUser.canManageProjects) return <Navigate to="/" replace />;
  return <Outlet />;
}
