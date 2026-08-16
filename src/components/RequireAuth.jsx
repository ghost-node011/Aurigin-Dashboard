import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AuthLoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <img src="/logo.png" alt="" className="h-12 w-12 animate-pulse rounded-xl object-cover" />
    </div>
  );
}

export function RequireAuth() {
  const { currentUser, authLoading } = useAuth();
  if (authLoading) return <AuthLoadingScreen />;
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
