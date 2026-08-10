import { Outlet } from "react-router-dom";
import { Bell } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { formatDate } from "../lib/date";

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-8">
          <p className="text-sm text-muted-foreground">{formatDate(new Date(), { weekday: "long", month: "long", day: "numeric" })}</p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-surface-muted"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-danger" />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
