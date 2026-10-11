import { useEffect, useState } from "react";
import { CheckCircle2, Eye, Lock, Rocket, Send } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../lib/date";
import { Card } from "../Card";
import { Button } from "../Button";
import { Input } from "../Input";
import { Modal } from "../Modal";

/**
 * BeeBark's launch email to its waitlist. BeeBark picks the audience (the
 * waitlist minus region sign-ups and people who already have an account) and
 * never emails anyone this template twice. Admins can preview and send tests;
 * only people given "BeeBark launch email" permission can send it for real.
 */
export function LaunchEmailCard() {
  const { currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(null); // "test" | "send" | "cancel"
  const [preview, setPreview] = useState(null);
  const [testEmails, setTestEmails] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  const load = () =>
    api.getBeebarkLaunch().then(
      (d) => {
        setData(d);
        setError(null);
      },
      (err) => setError(err.message),
    );

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setTestEmails((v) => v || currentUser?.email || "");
  }, [currentUser]);

  // Refresh stats while a send is going out
  const sending = data?.requests?.some((r) => ["queued", "sending"].includes(r.status));
  useEffect(() => {
    if (!sending) return undefined;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [sending]);

  async function openPreview() {
    setError(null);
    try {
      setPreview(await api.previewBeebarkLaunch());
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendTest() {
    setBusy("test");
    setError(null);
    setNotice(null);
    try {
      const r = await api.testBeebarkLaunch(testEmails);
      setNotice(`Test sent to ${r.sentTo.join(", ")}.`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function sendForReal() {
    setBusy("send");
    setError(null);
    try {
      const r = await api.sendBeebarkLaunch(data.audience.queued);
      setConfirming(false);
      setTyped("");
      setNotice(`Sending to ${r.queued} ${r.queued === 1 ? "person" : "people"}. Delivery stats appear below.`);
      load();
    } catch (err) {
      setError(err.message);
      load();
    } finally {
      setBusy(null);
    }
  }

  async function stop(requestId) {
    setBusy("cancel");
    try {
      await api.cancelBeebarkLaunch(requestId);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  const a = data?.audience;
  const real = (data?.requests ?? []).filter((r) => !r.test);
  const tests = (data?.requests ?? []).filter((r) => r.test);

  return (
    <Card title="Launch email">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <Rocket className="h-4 w-4 text-primary" /> {data?.template.subject ?? "Today, BeeBark opens its doors"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            From BeeBark &lt;no-reply@thebeebark.com&gt; · links to thebeebark.com/register · each person gets it once
          </p>
          {a && (
            <p className="mt-3 text-sm" data-testid="launch-audience">
              <span className="font-display text-2xl tabular-nums">{a.queued}</span>{" "}
              {a.queued === 1 ? "person" : "people"} will receive it
              <span className="block text-xs text-muted-foreground">
                Of {a.waitlist} on the waitlist, skipped: {a.excluded.hasAccount} already have an account · {a.excluded.region} waiting for their region
                (Kerala, Tamil Nadu) · {a.skipped.suppressed} unsubscribed · {a.skipped.duplicate} already received it
                {a.skipped.invalid ? ` · ${a.skipped.invalid} invalid email` : ""}
              </span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" onClick={openPreview} disabled={!data}>
            <Eye className="h-4 w-4" /> Preview
          </Button>
          {data?.canSend ? (
            <Button onClick={() => setConfirming(true)} disabled={!a?.queued || busy === "send" || sending} data-testid="launch-send">
              <Send className="h-4 w-4" /> Send to {a?.queued ?? "…"}
            </Button>
          ) : (
            data && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted-foreground" data-testid="launch-locked">
                <Lock className="h-3.5 w-3.5" /> Only people given "BeeBark launch email" permission can send
              </span>
            )
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Input value={testEmails} onChange={(e) => setTestEmails(e.target.value)} placeholder="Test to (up to 5 emails)" className="h-9 w-full py-1.5 sm:w-80" aria-label="Test email addresses" />
        <Button size="sm" variant="outline" onClick={sendTest} disabled={busy === "test" || !data}>
          {busy === "test" ? "Sending…" : "Send test"}
        </Button>
        <span className="text-xs text-muted-foreground">Tests don't count: the real send still reaches everyone.</span>
      </div>

      {notice && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> {notice}
        </p>
      )}
      {error && <p className="mt-3 rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}

      {real.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Sends</p>
          <ul className="space-y-2">
            {real.map((r) => (
              <li key={r.requestId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                <span>
                  {formatDate(new Date(r.createdAt), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · by {r.createdBy || "—"} ·{" "}
                  <span className="capitalize">{r.status}</span>
                </span>
                <span className="flex flex-wrap items-center gap-3 tabular-nums text-muted-foreground">
                  <span>{r.stats.sent}/{r.stats.total} sent</span>
                  <span>{r.stats.delivered} delivered</span>
                  <span>{r.stats.opened} opened ({r.stats.openRate}%)</span>
                  <span>{r.stats.clicked} clicked</span>
                  {r.stats.bounced > 0 && <span className="text-danger">{r.stats.bounced} bounced</span>}
                  {data.canSend && ["queued", "sending"].includes(r.status) && (
                    <Button size="sm" variant="outline" onClick={() => stop(r.requestId)} disabled={busy === "cancel"}>
                      Stop
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {tests.length > 0 && <p className="mt-3 text-xs text-muted-foreground">{tests.length} test {tests.length === 1 ? "send" : "sends"} so far.</p>}

      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.subject ?? "Preview"} size="lg">
        {preview && <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="-m-5 h-[36rem] w-[calc(100%+2.5rem)] bg-white" />}
      </Modal>

      <Modal open={confirming} onClose={() => !busy && setConfirming(false)} title="Send the launch email?">
        <p className="text-sm">
          This emails <b>{a?.queued}</b> {a?.queued === 1 ? "person" : "people"} on BeeBark's waitlist now. It can't be unsent, though you can stop it while it's still going out.
        </p>
        <label className="mt-4 block text-sm">
          Type <b>{a?.queued}</b> to confirm
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} inputMode="numeric" className="mt-1" autoFocus data-testid="launch-confirm-input" />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirming(false)} disabled={busy === "send"}>
            Cancel
          </Button>
          <Button onClick={sendForReal} disabled={busy === "send" || typed.trim() !== String(a?.queued)} data-testid="launch-confirm">
            {busy === "send" ? "Sending…" : `Send to ${a?.queued}`}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
