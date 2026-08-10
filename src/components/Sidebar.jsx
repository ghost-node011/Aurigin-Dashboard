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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { cn } from "../lib/cn";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "hr", "manager", "employee"] },
  { to: "/directory", label: "Directory", icon: Users, roles: ["admin", "hr", "manager", "employee"] },
  { to: "/attendance", label: "Attendance", icon: CalendarClock, roles: ["admin", "hr", "manager", "employee"] },
  { to: "/leave", label: "Leave", icon: CalendarDays, roles: ["admin", "hr", "manager", "employee"] },
  { to: "/onboarding", label: "Onboarding", icon: ClipboardList, roles: ["admin", "hr", "manager", "employee"] },
  { to: "/recognition", label: "Recognition", icon: Award, roles: ["admin", "hr", "manager", "employee"] },
  { to: "/announcements", label: "Announcements", icon: Megaphone, roles: ["admin", "hr", "manager", "employee"] },
  { to: "/org-chart", label: "Org Chart", icon: Network, roles: ["admin", "hr", "manager", "employee"] },
  { to: "/analytics", label: "Analytics", icon: BarChart3, roles: ["admin", "hr"] },
];

export function Sidebar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const items = NAV_ITEMS.filter((item) => item.roles.includes(currentUser.role));

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <img src="/logo.png" alt="" className="h-8 w-8 rounded-md object-cover" />
        <div>
          <p className="font-display text-base font-semibold leading-tight">Aurigin People</p>
          <p className="text-[11px] text-muted-foreground">HR Portal</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
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
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            aria-label="Switch user / log out"
            title="Switch user / log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
