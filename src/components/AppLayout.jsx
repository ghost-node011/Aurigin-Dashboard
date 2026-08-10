import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Bell, Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { formatDate } from "../lib/date";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-surface-muted md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            <p className="truncate text-sm text-muted-foreground">
              {formatDate(new Date(), { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
