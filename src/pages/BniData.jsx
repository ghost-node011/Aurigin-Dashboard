import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Download, Mail, Phone, Search, Send, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Input, Select } from "../components/Input";
import { cn } from "../lib/cn";
import { SendEmailModal } from "../components/bni/SendEmailModal";
import { EMAIL_STATUS } from "../components/bni/emailStatus";

const CATEGORY_LABEL = {
  "interior designer": "Interior designers",
  architects: "Architects",
  construction: "Construction",
  "real estate": "Real estate",
};

/**
 * BNI member leads (admins only): interior designers, architects,
 * construction and real estate. Verified-Indian members come first; the
 * rest are email contacts whose country isn't recorded.
 */
export default function BniData() {
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
  }, []);

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
    api.getBniContacts({ ...filters, page, limit: 50 }).then(
      (d) => !cancelled && setData(d),
      (err) => !cancelled && setError(err.message),
    );
    return () => {
      cancelled = true;
    };
  }, [filters, page]);

  // Latest BeeBark email status for the members on this page
  useEffect(() => {
    const ids = data?.items.map((c) => c.id) ?? [];
    if (ids.length === 0) return;
    let cancelled = false;
    api.getBniEmailStatus(ids).then(
      (d) => !cancelled && setEmailStatus((prev) => ({ ...prev, ...d.statuses })),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [data]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">BNI data</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total.toLocaleString("en-IN")} BNI members across four categories. Visible to admins only.
          </p>
        </div>
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
      </div>

      <SendEmailModal open={emailing} onClose={() => setEmailing(false)} filters={filters} />

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

      <Card title={data ? `${data.total.toLocaleString("en-IN")} member${data.total === 1 ? "" : "s"}` : "Loading…"}>
        {data && data.items.length === 0 && <p className="text-sm text-muted-foreground">No members match these filters.</p>}
        {data && data.items.length > 0 && (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full min-w-[64rem] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Company</th>
                  <th className="px-2 py-2 font-medium">Category</th>
                  <th className="px-2 py-2 font-medium">Phone</th>
                  <th className="px-2 py-2 font-medium">Email</th>
                  <th className="px-2 py-2 font-medium">BeeBark email</th>
                  <th className="px-4 py-2 font-medium">Chapter</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id} className="border-b border-border align-top last:border-b-0 hover:bg-surface-muted/60">
                    <td className="px-4 py-2">
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
                    <td className="px-4 py-2 text-muted-foreground">{c.chapter || "—"}</td>
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
    </div>
  );
}
