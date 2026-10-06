import { useEffect, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Modal } from "../Modal";
import { Button } from "../Button";
import { Input, Select } from "../Input";

/**
 * Step 2: send the follow-up (with links) to everyone an earlier send reached.
 * Same subject, so Gmail shows it in the same conversation.
 */
export function FollowUpModal({ open, onClose, request, onSent }) {
  const { currentUser } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [count, setCount] = useState(null);
  const [preview, setPreview] = useState(null);
  const [testEmails, setTestEmails] = useState("");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open || !request) return;
    setError(null);
    setNotice(null);
    setResult(null);
    setChecked(false);
    setTestEmails((v) => v || currentUser?.email || "");
    api.getBniEmailTemplates().then(
      (d) => {
        const active = d.items.filter((t) => t.active);
        setTemplates(active);
        const suggested = d.followUpFor?.[request.templateId];
        setTemplateId(active.some((t) => t.templateId === suggested) ? suggested : active[0]?.templateId ?? "");
      },
      (err) => setError(err.message),
    );
  }, [open, request, currentUser]);

  useEffect(() => {
    if (!open || !request || !templateId) return;
    setCount(null);
    setPreview(null);
    setChecked(false);
    api.bniFollowUp(request.requestId, { templateId, dryRun: true }).then(setCount, (err) => setError(err.message));
    api.previewBniEmail(templateId, "Meera Iyer").then(setPreview, () => {});
  }, [open, request, templateId]);

  async function sendTest() {
    setBusy("test");
    setError(null);
    try {
      const r = await api.sendBniEmail({ templateId, test: true, testEmails });
      setNotice(`Test sent to ${r.sentTo.join(", ")}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    setBusy("send");
    setError(null);
    try {
      const r = await api.bniFollowUp(request.requestId, { templateId, confirmCount: count.queued });
      setResult(r);
      onSent?.(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  const template = templates.find((t) => t.templateId === templateId);
  const sameSubject = template && request && template.subject === request.subject;

  return (
    <Modal open={open} onClose={onClose} title="Send follow-up" size="lg">
      {result ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-success-soft p-4 text-success">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold">
              Sending the follow-up to {result.queued.toLocaleString("en-IN")} member{result.queued === 1 ? "" : "s"} · <span className="font-mono">{result.requestId}</span>
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recipients</p>
              <p className="mt-1 font-display text-2xl tabular-nums">{count ? count.queued.toLocaleString("en-IN") : "…"}</p>
              <p className="text-xs text-muted-foreground">
                Everyone the first email reached. Bounced, failed, spam-reported, unsubscribed and already-followed-up people are left out
                {count && count.skipped.duplicate + count.skipped.suppressed > 0
                  ? ` (${count.skipped.duplicate + count.skipped.suppressed} skipped)`
                  : ""}
                .
              </p>
            </div>
            <div>
              <label htmlFor="bni-followup-template" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Template
              </label>
              <Select id="bni-followup-template" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="mt-1">
                {templates.map((t) => (
                  <option key={t.templateId} value={t.templateId}>
                    {t.name}
                  </option>
                ))}
              </Select>
              <p className={`mt-1 text-xs ${sameSubject ? "text-success" : "text-muted-foreground"}`}>
                {sameSubject ? "Same subject: it will appear in the same Gmail conversation." : "Different subject: it will arrive as a new email."}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="border-b border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
              {template?.fromName || "BeeBark"} · {preview?.subject ?? "…"} · preview for “Meera Iyer”
            </div>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap bg-white p-4 font-sans text-sm text-neutral-800">{preview ? preview.text : "Loading preview…"}</pre>
          </div>

          <div>
            <label htmlFor="bni-followup-test" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Send a test to
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              <Input id="bni-followup-test" value={testEmails} onChange={(e) => setTestEmails(e.target.value)} placeholder="you@example.com" className="min-w-0 flex-1" />
              <Button variant="outline" onClick={sendTest} disabled={!templateId || !testEmails.trim() || busy !== null}>
                {busy === "test" ? "Sending test…" : "Send test"}
              </Button>
            </div>
          </div>

          {notice && <p className="text-sm text-success">{notice}</p>}
          {error && <p className="text-sm text-danger">{error}</p>}

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5" />
            <span>I've checked the preview and the test email.</span>
          </label>

          <div className="flex justify-end">
            <Button onClick={send} disabled={!count?.queued || !checked || busy !== null}>
              <Send className="h-4 w-4" />
              {busy === "send" ? "Starting…" : `Send follow-up to ${count ? count.queued.toLocaleString("en-IN") : "…"}`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
