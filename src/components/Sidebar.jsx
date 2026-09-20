import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Award,
  Megaphone,
  Network,
  BarChart3,
  LogOut,
  KeyRound,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { cn } from "../lib/cn";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "hr", "manager", "employee"] },
  { to: "/directory", label: "Directory", icon: Users, roles: ["admin", "hr", "manager", "employee"] },
  { to: "/attendance", label: "Attendance", icon: CalendarClock, roles: ["admin", "hr", "manager", "employee"] },
  { to: "/leave", label: "Leave", icon: CalendarDays, roles: ["admin", "hr", "manager", "employee"] },
  {
    to: "/onboarding",
    label: "Onboarding",
    icon: ClipboardList,
    // HR/admin manage onboarding for everyone; anyone else only sees this
    // while they themselves have an active checklist to work through.
    visible: (user) => ["admin", "hr"].includes(user.role) || user.status === "Onboarding",
  },
  { to: "/recognition", label: "Recognition", icon: Award, roles: ["admin", "hr", "manager", "employee"] },
  { to: "/announcements", label: "Announcements", icon: Megaphone, roles: ["admin", "hr", "manager", "employee"] },
  { to: "/org-chart", label: "Org Chart", icon: Network, roles: ["admin", "hr", "manager", "employee"] },
  { to: "/analytics", label: "Analytics", icon: BarChart3, roles: ["admin", "hr"] },
  { to: "/settings", label: "Settings", icon: SlidersHorizontal, roles: ["admin", "hr"] },
];

export function Sidebar({ open = false, onClose }) {
  const { currentUser, logout, refreshCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  if (!currentUser) return null;

  const items = NAV_ITEMS.filter((item) =>
    item.visible ? item.visible(currentUser) : item.roles.includes(currentUser.role),
  );

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface transition-transform duration-200 md:static md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex items-center gap-2.5 px-5 py-5">
        <img src="/logo-mark.png" alt="" className="h-8 w-8 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold leading-tight">Aurigin People</p>
          <p className="text-[11px] text-muted-foreground">HR Portal</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground md:hidden"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar employee={currentUser} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{currentUser.name}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">{currentUser.role}</p>
          </div>
          <button
            type="button"
            onClick={() => setChangePasswordOpen(true)}
            className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            aria-label="Change password"
            title={currentUser.mustChangePassword ? "Change your temporary password" : "Change password"}
          >
            <KeyRound className="h-4 w-4" />
            {currentUser.mustChangePassword && (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-danger" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ChangePasswordModal
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        onChanged={refreshCurrentUser}
      />
    </aside>
  );
}
