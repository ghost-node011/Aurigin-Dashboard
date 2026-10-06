import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Download, Mail, Phone, RotateCcw, Search, Send, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Input, Select } from "../components/Input";
import { cn } from "../lib/cn";
import { SendEmailModal } from "../components/bni/SendEmailModal";
import { EMAIL_STATUS } from "../components/bni/emailStatus";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";

const CATEGORY_LABEL = {
  "interior designer": "Interior designers",
  architects: "Architects",
  construction: "Construction",
  "real estate": "Real estate",
};

/**
 * BNI member leads: interior designers, architects, construction and real
 * estate. Verified-Indian members come first; the rest are email contacts
 * whose country isn't recorded.
 *
 * Admins see everything. People granted the BNI directory can view and
 * remove members, but can't export, email or see email reports.
 */
export default function BniData() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [view, setView] = useState("directory"); // "directory" | "removed" (admins)
  const [selected, setSelected] = useState(() => new Set());
  const [confirming, setConfirming] = useState(null); // members about to be removed
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [removedTotal, setRemovedTotal] = useState(0);
  const [reload, setReload] = useState(0);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ category: "", phone: "", email: "", verified: "", q: "" });
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailStatus, setEmailStatus] = useState({});

  useEffect(() => {
    api.getBniStats().then(setStats, (err) => setError(err.message));
    if (isAdmin) api.getBniContacts({ removed: "yes", limit: 1 }).then((d) => setRemovedTotal(d.total), () => {});
  }, [isAdmin, reload]);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === text ? f : { ...f, q: text }));
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api.getBniContacts({ ...filters, ...(view === "removed" ? { removed: "yes" } : {}), page, limit: 50 }).then(
      (d) => {
        if (cancelled) return;
        setData(d);
        setSelected(new Set());
      },
      (err) => !cancelled && setError(err.message),
    );
    return () => {
      cancelled = true;
    };
  }, [filters, page, view, reload]);

  // Latest BeeBark email status for the members on this page (admins only)
  useEffect(() => {
    const ids = data?.items.map((c) => c.id) ?? [];
    if (!isAdmin || ids.length === 0) return;
    let cancelled = false;
    api.getBniEmailStatus(ids).then(
      (d) => !cancelled && setEmailStatus((prev) => ({ ...prev, ...d.statuses })),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [data, isAdmin]);

  const set = (key) => (e) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }));
    setPage(1);
  };

  async function exportCsv() {
    setExporting(true);
    try {
      const blob = await api.downloadBniCsv(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bni-data${filters.category ? "-" + filters.category.replace(/\s+/g, "-") : ""}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  const total = stats?.reduce((s, c) => s + c.total, 0) ?? 0;
  const items = data?.items ?? [];
  const removedView = view === "removed";
  const allOnPage = items.length > 0 && items.every((c) => selected.has(c.id));
  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const toggleAll = () => setSelected(allOnPage ? new Set() : new Set(items.map((c) => c.id)));

  async function removeMembers() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.removeBniMembers(confirming.map((c) => c.id));
      setNotice(
        `Removed ${r.removed} member${r.removed === 1 ? "" : "s"}. They won't be emailed again` +
          (r.emailBlockFailed ? ` (${r.emailBlockFailed} email address${r.emailBlockFailed === 1 ? "" : "es"} couldn't be added to BeeBark's do-not-email list, but they're already out of every send from here).` : "."),
      );
      setConfirming(null);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function restoreMembers(list) {
    setBusy(true);
    setError(null);
    try {
      const r = await api.restoreBniMembers(list.map((c) => c.id));
      setNotice(`Restored ${r.restored} member${r.restored === 1 ? "" : "s"} to the directory. Their email addresses stay on the do-not-email list.`);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">BNI data</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total.toLocaleString("en-IN")} BNI members across four categories.{" "}
            {isAdmin ? "Visible to admins and people given BNI access." : "You can view and remove members."}
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Link to="/bni/emails">
              <Button variant="outline">
                <BarChart3 className="h-4 w-4" /> Email reports
              </Button>
            </Link>
            <Button variant="outline" onClick={exportCsv} disabled={exporting}>
              <Download className="h-4 w-4" /> {exporting ? "Exporting…" : "Export CSV"}
            </Button>
            <Button onClick={() => setEmailing(true)}>
              <Send className="h-4 w-4" /> Email members
            </Button>
          </div>
        )}
      </div>

      {isAdmin && <SendEmailModal open={emailing} onClose={() => setEmailing(false)} filters={filters} />}

      {isAdmin && (
        <div className="inline-flex rounded-xl border border-border bg-surface p-1 text-sm" role="tablist">
          {[
            { id: "directory", label: "Directory" },
            { id: "removed", label: `Removed${removedTotal ? ` (${removedTotal.toLocaleString("en-IN")})` : ""}` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={view === t.id}
              onClick={() => {
                setView(t.id);
                setPage(1);
                setNotice(null);
              }}
              className={cn("rounded-lg px-3 py-1.5 font-medium", view === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              data-testid={`bni-view-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(stats ?? []).map((c) => (
          <button
            key={c.category}
            type="button"
            onClick={() => {
              setFilters((f) => ({ ...f, category: f.category === c.category ? "" : c.category }));
              setPage(1);
            }}
            className={cn(
              "rounded-2xl border bg-surface p-4 text-left transition hover:border-primary/40",
              filters.category === c.category ? "border-primary ring-1 ring-primary" : "border-border",
            )}
          >
            <p className="text-sm text-muted-foreground">{CATEGORY_LABEL[c.category]}</p>
            <p className="mt-1 font-display text-2xl tabular-nums">{c.total.toLocaleString("en-IN")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {c.phone} with phone · {c.email} with email · {c.verified} verified Indian
            </p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Name, company, chapter, email, phone, city" className="h-9 py-1.5 pl-9" />
        </div>
        <Select value={filters.category} onChange={set("category")} className="h-9 w-auto" aria-label="Category">
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Select value={filters.phone} onChange={set("phone")} className="h-9 w-auto" aria-label="Phone">
          <option value="">Phone: any</option>
          <option value="yes">Has phone</option>
          <option value="no">No phone</option>
        </Select>
        <Select value={filters.email} onChange={set("email")} className="h-9 w-auto" aria-label="Email">
          <option value="">Email: any</option>
          <option value="yes">Has email</option>
          <option value="no">No email</option>
        </Select>
        <Select value={filters.verified} onChange={set("verified")} className="h-9 w-auto" aria-label="Verified Indian">
          <option value="">India: any</option>
          <option value="yes">Verified Indian</option>
          <option value="no">Not verified</option>
        </Select>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {notice && <p className="rounded-xl bg-success-soft px-4 py-2.5 text-sm text-success" data-testid="bni-notice">{notice}</p>}

      {selected.size > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-sm">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            {removedView ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => restoreMembers(items.filter((c) => selected.has(c.id)))} data-testid="bni-restore-selected">
                <RotateCcw className="h-4 w-4" /> Restore {selected.size}
              </Button>
            ) : (
              <Button size="sm" variant="danger" onClick={() => setConfirming(items.filter((c) => selected.has(c.id)))} data-testid="bni-remove-selected">
                <Trash2 className="h-4 w-4" /> Remove {selected.size}
              </Button>
            )}
          </div>
        </div>
      )}

      <Card title={data ? `${data.total.toLocaleString("en-IN")} ${removedView ? "removed " : ""}member${data.total === 1 ? "" : "s"}` : "Loading…"}>
        {data && data.items.length === 0 && <p className="text-sm text-muted-foreground">{removedView ? "No one has been removed." : "No members match these filters."}</p>}
        {data && data.items.length > 0 && (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full min-w-[64rem] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-10 py-2 pl-4">
                    <input type="checkbox" checked={allOnPage} onChange={toggleAll} className="h-4 w-4 accent-primary" aria-label="Select all on this page" />
                  </th>
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Company</th>
                  <th className="px-2 py-2 font-medium">Category</th>
                  <th className="px-2 py-2 font-medium">Phone</th>
                  <th className="px-2 py-2 font-medium">Email</th>
                  {isAdmin && !removedView && <th className="px-2 py-2 font-medium">BeeBark email</th>}
                  <th className="px-2 py-2 font-medium">{removedView ? "Removed" : "Chapter"}</th>
                  <th className="w-12 px-4 py-2" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id} className={cn("border-b border-border align-top last:border-b-0 hover:bg-surface-muted/60", selected.has(c.id) && "bg-primary/5")} data-testid={`bni-row-${c.id}`}>
                    <td className="py-2 pl-4">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="mt-1 h-4 w-4 accent-primary" aria-label={`Select ${c.name || "member"}`} />
                    </td>
                    <td className="px-2 py-2">
                      <p className="font-medium">{c.name || "—"}</p>
                      {c.verifiedIndian ? (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-success">
                          <ShieldCheck className="h-3 w-3" /> Verified Indian
                        </span>
                      ) : (
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">India not verified</span>
                      )}
                    </td>
                    <td className="max-w-[14rem] px-2 py-2">
                      <p className="truncate">{c.company || "—"}</p>
                      {c.role && <p className="truncate text-xs text-muted-foreground">{c.role}</p>}
                    </td>
                    <td className="px-2 py-2">
                      <Badge>{CATEGORY_LABEL[c.category] ?? c.category}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">
                      {c.mobile || c.phone ? (
                        <a href={`tel:${(c.mobile || c.phone).replace(/\s/g, "")}`} className="inline-flex items-center gap-1 hover:text-primary">
                          <Phone className="h-3 w-3" /> {c.mobile || c.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="max-w-[16rem] px-2 py-2">
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="inline-flex max-w-full items-center gap-1 truncate hover:text-primary">
                          <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{c.email}</span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    {isAdmin && !removedView && (
                    <td className="whitespace-nowrap px-2 py-2">
                      {emailStatus[c.id] ? (
                        <Link to={`/bni/emails?request=${encodeURIComponent(emailStatus[c.id].requestId)}`} className="inline-flex flex-col">
                          <Badge tone={emailStatus[c.id].openCount > 0 ? "info" : EMAIL_STATUS[emailStatus[c.id].status]?.tone}>
                            {emailStatus[c.id].openCount > 0 ? "Opened" : EMAIL_STATUS[emailStatus[c.id].status]?.label ?? emailStatus[c.id].status}
                          </Badge>
                          {emailStatus[c.id].clickCount > 0 && <span className="mt-0.5 text-[11px] text-info">Clicked</span>}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    )}
                    <td className="px-2 py-2 text-muted-foreground">
                      {removedView ? (
                        <span className="text-xs">
                          {c.removedAt ? new Date(c.removedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                          {c.removedByName && <span className="block">by {c.removedByName}</span>}
                        </span>
                      ) : (
                        c.chapter || "—"
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {removedView ? (
                        <button type="button" disabled={busy} onClick={() => restoreMembers([c])} className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground" title="Restore to the directory" aria-label={`Restore ${c.name || "member"}`} data-testid={`bni-restore-${c.id}`}>
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      ) : (
                        <button type="button" onClick={() => setConfirming([c])} className="rounded-md p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger" title="Remove from the directory" aria-label={`Remove ${c.name || "member"}`} data-testid={`bni-remove-${c.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.pages > 1 && (
          <div className="mt-8 flex items-center justify-between text-sm">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-muted-foreground">
              Page {data.page} of {data.pages}
            </span>
            <Button size="sm" variant="outline" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </Card>

      <Modal open={Boolean(confirming)} onClose={() => !busy && setConfirming(null)} title={confirming?.length === 1 ? "Remove this member?" : `Remove ${confirming?.length ?? 0} members?`}>
        {confirming && (
          <div className="space-y-4 text-sm">
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-surface-muted p-3">
              {confirming.slice(0, 20).map((c) => (
                <li key={c.id} className="truncate">
                  <span className="font-medium">{c.name || "Unnamed"}</span>
                  {c.email && <span className="text-muted-foreground"> · {c.email}</span>}
                </li>
              ))}
              {confirming.length > 20 && <li className="text-muted-foreground">and {confirming.length - 20} more</li>}
            </ul>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>They leave the BNI directory and every email audience.</li>
              <li>Their email addresses go on the do-not-email list, so no future email reaches them.</li>
              <li>{isAdmin ? "You can restore them from the Removed tab." : "Only an admin can bring them back."}</li>
            </ul>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(null)} disabled={busy}>Cancel</Button>
              <Button variant="danger" onClick={removeMembers} disabled={busy} data-testid="bni-remove-confirm">
                <Trash2 className="h-4 w-4" /> {busy ? "Removing…" : "Remove"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
