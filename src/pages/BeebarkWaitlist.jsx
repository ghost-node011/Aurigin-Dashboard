import { useEffect, useState } from "react";
import { Download, Mail, Search } from "lucide-react";
import { api } from "../lib/api";
import { formatDate } from "../lib/date";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Input, Select } from "../components/Input";

/**
 * BeeBark's pre-launch waitlist (admins only), read live from BeeBark's
 * backend through ours — nothing is stored here.
 */
export default function BeebarkWaitlist() {
  const [filters, setFilters] = useState({ q: "", role: "", careerStage: "", interest: "", from: "", to: "" });
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

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
    api.getBeebarkWaitlist({ ...filters, page, limit: 50 }).then(
      (d) => !cancelled && setData(d),
      (err) => !cancelled && setError(err.message),
    );
    return () => {
      cancelled = true;
    };
  }, [filters, page]);

  const set = (key) => (e) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }));
    setPage(1);
  };

  async function exportCsv() {
    setExporting(true);
    try {
      const url = URL.createObjectURL(await api.downloadBeebarkCsv(filters));
      const a = document.createElement("a");
      a.href = url;
      a.download = "beebark-waitlist.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  const stats = data?.stats;
  const options = (rows) => (rows ?? []).filter((r) => r.value);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">BeeBark waitlist</h1>
          <p className="mt-1 text-sm text-muted-foreground">Live from BeeBark's pre-launch sign-ups. Visible to admins only.</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={exporting || !data}>
          <Download className="h-4 w-4" /> {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>

      {error && <p className="rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}

      {stats && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,2fr)]">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
            <Tile label="On the waitlist" value={stats.total} />
            <Tile label="Joined in the last 7 days" value={stats.last7Days} />
          </div>
          <Breakdown title="By role" rows={stats.byRole} total={stats.total} />
          <Breakdown title="By career stage" rows={stats.byCareerStage} total={stats.total} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Name or email" className="h-9 py-1.5 pl-9" />
        </div>
        <Select value={filters.role} onChange={set("role")} className="h-9 w-auto" aria-label="Role">
          <option value="">All roles</option>
          {options(stats?.byRole).map((r) => (
            <option key={r.value}>{r.value}</option>
          ))}
        </Select>
        <Select value={filters.careerStage} onChange={set("careerStage")} className="h-9 w-auto" aria-label="Career stage">
          <option value="">All stages</option>
          {options(stats?.byCareerStage).map((r) => (
            <option key={r.value}>{r.value}</option>
          ))}
        </Select>
        <Select value={filters.interest} onChange={set("interest")} className="h-9 w-auto" aria-label="Interest">
          <option value="">All interests</option>
          {options(stats?.byInterest).map((r) => (
            <option key={r.value}>{r.value}</option>
          ))}
        </Select>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          Joined
          <Input type="date" value={filters.from} onChange={set("from")} className="h-9 w-auto" aria-label="Joined from" />
          to
          <Input type="date" value={filters.to} onChange={set("to")} className="h-9 w-auto" aria-label="Joined to" />
        </span>
      </div>

      <Card title={data ? `${data.total} ${data.total === 1 ? "person" : "people"}` : "Loading…"}>
        {data && data.items.length === 0 && <p className="text-sm text-muted-foreground">Nobody matches these filters.</p>}
        {data && data.items.length > 0 && (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Email</th>
                  <th className="px-2 py-2 font-medium">Role</th>
                  <th className="px-2 py-2 font-medium">Career stage</th>
                  <th className="px-2 py-2 font-medium">Looking to</th>
                  <th className="px-5 py-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id} className="border-b border-border align-top last:border-b-0 hover:bg-surface-muted/60">
                    <td className="px-5 py-2.5 font-medium">{p.name}</td>
                    <td className="max-w-[16rem] px-2 py-2.5">
                      <a href={`mailto:${p.email}`} className="inline-flex max-w-full items-center gap-1 hover:text-primary">
                        <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{p.email}</span>
                      </a>
                      {!p.confirmationSentAt && <span className="block text-[11px] text-warning">Welcome email not sent</span>}
                    </td>
                    <td className="px-2 py-2.5">
                      {p.role ? <Badge>{p.role === "Other" && p.roleOther ? p.roleOther : p.role}</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-2 py-2.5 text-muted-foreground">{p.careerStage ?? "—"}</td>
                    <td className="max-w-[14rem] px-2 py-2.5 text-muted-foreground">
                      {p.interest ?? (p.interests?.length ? p.interests.join(", ") : "—")}
                    </td>
                    <td className="whitespace-nowrap px-5 py-2.5 text-muted-foreground">
                      {formatDate(new Date(p.createdAt), { day: "numeric", month: "short", year: "numeric" })}
                      {p.source && <span className="block text-[11px]">via {p.source}</span>}
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
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl tabular-nums">{value}</p>
    </div>
  );
}

/** Counts as a ranked list with proportion bars — a share of one total, one hue. */
function Breakdown({ title, rows, total }) {
  const list = (rows ?? []).map((r) => ({ ...r, value: r.value ?? "Not answered" }));
  return (
    <Card title={title}>
      <ul className="space-y-2.5">
        {list.map((r) => (
          <li key={r.value} className="text-sm">
            <div className="flex justify-between gap-3">
              <span className="truncate">{r.value}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{r.count}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${total ? (r.count / total) * 100 : 0}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
