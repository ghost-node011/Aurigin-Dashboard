import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { api } from "../lib/api";
import { cn } from "../lib/cn";

const POLL_MS = 60_000;

function ago(date) {
  const mins = Math.round((Date.now() - new Date(date)) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * The header bell: the same events that are emailed (new issues,
 * assignments, mentions, leave and WFH requests and decisions, day digests).
 * Polls every minute and whenever the tab regains focus.
 */
export function NotificationBell() {
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const load = useCallback(() => api.getNotifications().then(setData, () => {}), []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    window.addEventListener("focus", load);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  // Close when clicking anywhere else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function openItem(item) {
    setOpen(false);
    if (!item.read) {
      setData((d) => ({ items: d.items.map((i) => (i.id === item.id ? { ...i, read: true } : i)), unread: Math.max(0, d.unread - 1) }));
      api.markNotificationsRead([item.id]).catch(() => {});
    }
    navigate(item.link || "/");
  }

  async function markAll() {
    setData((d) => ({ items: d.items.map((i) => ({ ...i, read: true })), unread: 0 }));
    await api.markNotificationsRead().catch(() => {});
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-surface-muted"
        aria-label={data.unread ? `Notifications, ${data.unread} unread` : "Notifications"}
      >
        <Bell className="h-4.5 w-4.5" />
        {data.unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {data.unread > 9 ? "9+" : data.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {data.unread > 0 && (
              <button type="button" onClick={markAll} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {data.items.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</li>}
            {data.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openItem(item)}
                  className={cn(
                    "flex w-full gap-2.5 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-surface-muted",
                    !item.read && "bg-primary-soft/40",
                  )}
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", item.read ? "bg-transparent" : "bg-primary")} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{item.title}</span>
                    {item.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{item.body}</span>}
                    <span className="mt-1 block text-[11px] text-muted-foreground">{ago(item.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
