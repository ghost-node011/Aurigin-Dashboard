import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { api } from "../lib/api";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { cn } from "../lib/cn";
import { CATEGORY_LABEL, EMAIL_STATUS, REQUEST_STATUS, formatDateTime } from "../components/bni/emailStatus";
import { FollowUpModal } from "../components/bni/FollowUpModal";

const LOG_TABS = [
  { key: "", label: "All" },
  { key: "delivered", label: "Delivered", query: { status: "delivered" } },
  { key: "opened", label: "Opened", query: { opened: "true" } },
  { key: "clicked", label: "Clicked", query: { clicked: "true" } },
  { key: "bounced", label: "Bounced", query: { status: "bounced" } },
  { key: "failed", label: "Failed", query: { status: "failed" } },
  { key: "complained", label: "Marked spam", query: { status: "complained" } },
  { key: "queued", label: "Queued", query: { status: "queued" } },
];

const pct = (v) => `${v ?? 0}%`;

/** Every BNI email send, with delivery, opens, clicks and bounces per send and per person. */
export default function BniEmails() {
  const [params, setParams] = useSearchParams();
  const selected = params.get("request");
  const [requests, setRequests] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);

  const loadRequests = useCallback(() => {
    api.getBniEmailRequests({ page, limit: 20 }).then(setRequests, (err) => setError(err.message));
  }, [page]);

  useEffect(loadRequests, [loadRequests]);

  // Refresh while anything is still sending
  useEffect(() => {
    if (!requests?.items.some((r) => r.status === "queued" || r.status === "sending")) return;
    const t = setInterval(loadRequests, 8000);
    return () => clearInterval(t);
  }, [requests, loadRequests]);

  if (selected) return <RequestDetail requestId={selected} onBack={() => setParams({})} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/bni" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> BNI data
          </Link>
          <h1 className="mt-1 font-display text-3xl font-semibold">BNI emails</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every email send to BNI members, from no-reply@thebeebark.com.</p>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card title={requests ? `${requests.total} send${requests.total === 1 ? "" : "s"}` : "Loading…"}>
        {requests && requests.items.length === 0 && (
          <p className="text-sm text-muted-foreground">No emails sent yet. Use “Email members” on the BNI data page.</p>
        )}
        {requests && requests.items.length > 0 && (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full min-w-[60rem] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Sent</th>
                  <th className="px-2 py-2 font-medium">Email</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 text-right font-medium">Recipients</th>
                  <th className="px-2 py-2 text-right font-medium">Delivered</th>
                  <th className="px-2 py-2 text-right font-medium">Opened</th>
                  <th className="px-2 py-2 text-right font-medium">Clicked</th>
                  <th className="px-4 py-2 text-right font-medium">Bounced / failed</th>
                </tr>
              </thead>
              <tbody>
                {requests.items.map((r) => (
                  <tr
                    key={r.requestId}
                    onClick={() => setParams({ request: r.requestId })}
                    className="cursor-pointer border-b border-border align-top last:border-b-0 hover:bg-surface-muted/60"
                  >
                    <td className="whitespace-nowrap px-4 py-2">
                      <p>{formatDateTime(r.createdAt)}</p>
                      <p className="text-xs text-muted-foreground">{r.createdBy || "—"}</p>
                    </td>
                    <td className="max-w-[20rem] px-2 py-2">
                      <p className="truncate font-medium">{r.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.templateId}
                        {r.audience ? ` · ${CATEGORY_LABEL[r.audience] ?? r.audience}` : ""}
                        {r.test ? " · test" : ""}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <Badge tone={REQUEST_STATUS[r.status]?.tone}>{REQUEST_STATUS[r.status]?.label ?? r.status}</Badge>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{r.stats.total.toLocaleString("en-IN")}</td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {r.stats.delivered.toLocaleString("en-IN")} <span className="text-xs text-muted-foreground">{pct(r.stats.deliveryRate)}</span>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {r.stats.opened.toLocaleString("en-IN")} <span className="text-xs text-muted-foreground">{pct(r.stats.openRate)}</span>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{r.stats.clicked.toLocaleString("en-IN")}</td>
                    <td className={cn("px-4 py-2 text-right tabular-nums", (r.stats.bounced || r.stats.failed) && "text-danger")}>
                      {r.stats.bounced} / {r.stats.failed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {requests && requests.pages > 1 && (
          <div className="mt-8 flex items-center justify-between text-sm">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-muted-foreground">
              Page {requests.page} of {requests.pages}
            </span>
            <Button size="sm" variant="outline" disabled={page >= requests.pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function RequestDetail({ requestId, onBack }) {
  const [request, setRequest] = useState(null);
  const [tab, setTab] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState(null);
  const [openLog, setOpenLog] = useState(null);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [followingUp, setFollowingUp] = useState(false);

  const load = useCallback(() => {
    api.getBniEmailRequest(requestId).then(setRequest, (err) => setError(err.message));
    const extra = LOG_TABS.find((t) => t.key === tab)?.query ?? {};
    api.getBniEmailLogs({ requestId, ...extra, q, page, limit: 50 }).then(setLogs, (err) => setError(err.message));
  }, [requestId, tab, q, page]);

  useEffect(load, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(text);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [text]);

  // Keep counts fresh while sending, and for a while after (opens keep arriving)
  useEffect(() => {
    const t = setInterval(load, request?.status === "sending" || request?.status === "queued" ? 5000 : 30000);
    return () => clearInterval(t);
  }, [load, request?.status]);

  async function cancel() {
    setCancelling(true);
    try {
      await api.cancelBniEmailRequest(requestId);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  }

  const s = request?.stats;
  const tiles = s
    ? [
        { label: "Recipients", value: s.total, sub: `${s.queued} still queued` },
        { label: "Delivered", value: s.delivered, sub: `${pct(s.deliveryRate)} of sent` },
        { label: "Opened", value: s.opened, sub: `${pct(s.openRate)} of delivered`, tone: "text-info" },
        { label: "Clicked", value: s.clicked, sub: `${pct(s.clickRate)} of delivered`, tone: "text-info" },
        { label: "Bounced", value: s.bounced, sub: `${pct(s.bounceRate)} of sent`, tone: s.bounced ? "text-danger" : "" },
        { label: "Failed / spam", value: s.failed + s.complained, sub: `${s.unsubscribed} unsubscribed`, tone: s.failed + s.complained ? "text-danger" : "" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> All sends
          </button>
          <h1 className="mt-1 truncate font-display text-2xl font-semibold">{request?.subject ?? "Loading…"}</h1>
          {request && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono">{request.requestId}</span> · {request.templateId} v{request.templateVersion} ·{" "}
              {formatDateTime(request.createdAt)} by {request.createdBy || "—"}
              {request.test ? " · test" : ""}
            </p>
          )}
        </div>
        {request && (
          <div className="flex items-center gap-2">
            <Badge tone={REQUEST_STATUS[request.status]?.tone}>{REQUEST_STATUS[request.status]?.label}</Badge>
            {request.status === "completed" && request.stats.delivered + request.stats.sent > 0 && (
              <Button size="sm" onClick={() => setFollowingUp(true)}>
                Send follow-up
              </Button>
            )}
            {(request.status === "sending" || request.status === "queued") && (
              <Button variant="danger" size="sm" onClick={cancel} disabled={cancelling}>
                {cancelling ? "Stopping…" : "Stop sending"}
              </Button>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {s && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs text-muted-foreground">{t.label}</p>
              <p className={cn("mt-1 font-display text-2xl tabular-nums", t.tone)}>{t.value.toLocaleString("en-IN")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.sub}</p>
            </div>
          ))}
        </div>
      )}
      {request && (request.skipped.duplicate > 0 || request.skipped.suppressed > 0 || request.skipped.invalid > 0) && (
        <p className="text-xs text-muted-foreground">
          Skipped before sending: {request.skipped.duplicate} already received it · {request.skipped.suppressed} unsubscribed or bounced earlier ·{" "}
          {request.skipped.invalid} invalid address
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
          {LOG_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                setPage(1);
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium",
                tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-muted",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Name or email" className="h-9 py-1.5 pl-9" />
        </div>
      </div>

      <Card title={logs ? `${logs.total.toLocaleString("en-IN")} recipient${logs.total === 1 ? "" : "s"}` : "Loading…"}>
        {logs && logs.items.length === 0 && <p className="text-sm text-muted-foreground">Nobody in this view.</p>}
        {logs && logs.items.length > 0 && (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Recipient</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Sent</th>
                  <th className="px-2 py-2 font-medium">Opened</th>
                  <th className="px-4 py-2 font-medium">Clicked</th>
                </tr>
              </thead>
              <tbody>
                {logs.items.map((l) => (
                  <tr key={l._id} onClick={() => setOpenLog(l._id)} className="cursor-pointer border-b border-border align-top last:border-b-0 hover:bg-surface-muted/60">
                    <td className="max-w-[18rem] px-4 py-2">
                      <p className="truncate font-medium">{l.name || "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">{l.to}</p>
                    </td>
                    <td className="px-2 py-2">
                      <Badge tone={EMAIL_STATUS[l.status]?.tone}>{EMAIL_STATUS[l.status]?.label ?? l.status}</Badge>
                      {l.unsubscribedAt && <p className="mt-0.5 text-[11px] text-muted-foreground">Unsubscribed</p>}
                      {(l.bounceReason || l.error) && <p className="mt-0.5 max-w-[14rem] truncate text-[11px] text-danger">{l.bounceReason || l.error}</p>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-muted-foreground">{formatDateTime(l.sentAt)}</td>
                    <td className="whitespace-nowrap px-2 py-2">
                      {l.openCount > 0 ? (
                        <>
                          {formatDateTime(l.openedAt)} <span className="text-xs text-muted-foreground">×{l.openCount}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {l.clickCount > 0 ? (
                        <>
                          {formatDateTime(l.clickedAt)} <span className="text-xs text-muted-foreground">×{l.clickCount}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {logs && logs.pages > 1 && (
          <div className="mt-8 flex items-center justify-between text-sm">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-muted-foreground">
              Page {logs.page} of {logs.pages}
            </span>
            <Button size="sm" variant="outline" disabled={page >= logs.pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </Card>

      {request && (
        <Card title="What was sent">
          <iframe title="Sent email" srcDoc={request.html} sandbox="" className="-m-5 h-[32rem] w-[calc(100%+2.5rem)] bg-white" />
        </Card>
      )}

      <LogTimeline id={openLog} onClose={() => setOpenLog(null)} />
      <FollowUpModal open={followingUp} onClose={() => setFollowingUp(false)} request={request} />
    </div>
  );
}

function LogTimeline({ id, onClose }) {
  const [log, setLog] = useState(null);
  const [stopping, setStopping] = useState(false);
  useEffect(() => {
    setLog(null);
    if (id) api.getBniEmailLog(id).then(setLog, () => {});
  }, [id]);

  // For someone who replied "no": never email this address again
  async function stopEmailing() {
    setStopping(true);
    try {
      await api.stopEmailing(log.to);
      setLog((l) => ({ ...l, unsubscribedAt: new Date().toISOString() }));
    } finally {
      setStopping(false);
    }
  }

  return (
    <Modal open={!!id} onClose={onClose} title={log ? log.name || log.to : "Loading…"}>
      {log && (
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-muted-foreground">{log.to}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone={EMAIL_STATUS[log.status]?.tone}>{EMAIL_STATUS[log.status]?.label ?? log.status}</Badge>
              {log.unsubscribedAt && <Badge tone="warning">Unsubscribed {formatDateTime(log.unsubscribedAt)}</Badge>}
            </div>
            {(log.bounceReason || log.error) && <p className="mt-2 text-danger">{log.bounceReason || log.error}</p>}
            {!log.unsubscribedAt && (
              <Button size="sm" variant="outline" className="mt-3" onClick={stopEmailing} disabled={stopping}>
                {stopping ? "Saving…" : "Stop emailing (replied “no”)"}
              </Button>
            )}
          </div>
          <ol className="space-y-2 border-l border-border pl-4">
            {log.events.length === 0 && <li className="text-muted-foreground">No events yet.</li>}
            {log.events.map((e, i) => (
              <li key={i}>
                <p className="font-medium">{e.type}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.at).toLocaleString("en-IN")}
                  {e.detail ? ` · ${e.detail}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Modal>
  );
}
