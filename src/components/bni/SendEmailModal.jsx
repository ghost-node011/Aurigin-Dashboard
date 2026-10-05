import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { api } from "../../lib/api";
import { Modal } from "../Modal";
import { Button } from "../Button";
import { Select } from "../Input";
import { CATEGORY_LABEL } from "./emailStatus";

const PREVIEW_NAME = "Meera Iyer";

/**
 * Email the BNI members matching the page's filters (only those with an
 * email address). Shows who will receive it, a live preview, a test send to
 * yourself, and a confirm step with the exact count.
 */
export function SendEmailModal({ open, onClose, filters }) {
  // The "has email" filter doesn't apply: only members with an email are sent to
  const audienceFilters = useMemo(() => {
    const { email: _ignored, ...rest } = filters;
    return rest;
  }, [filters]);

  const [templates, setTemplates] = useState(null);
  const [templateId, setTemplateId] = useState("");
  const [audience, setAudience] = useState(null);
  const [preview, setPreview] = useState(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(null); // "test" | "send"
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    setNotice(null);
    setError(null);
    setResult(null);
    setChecked(false);
    api.getBniEmailTemplates().then(
      (d) => {
        const active = d.items.filter((t) => t.active);
        setTemplates(active);
        const preferred = d.defaults?.[audienceFilters.category];
        setTemplateId(active.some((t) => t.templateId === preferred) ? preferred : active[0]?.templateId ?? "");
      },
      (err) => setError(err.message),
    );
    setAudience(null);
    api.getBniEmailAudience(audienceFilters).then(setAudience, (err) => setError(err.message));
  }, [open, audienceFilters]);

  useEffect(() => {
    if (!open || !templateId) return;
    setPreview(null);
    setChecked(false);
    api.previewBniEmail(templateId, PREVIEW_NAME).then(setPreview, (err) => setError(err.message));
  }, [open, templateId]);

  const template = templates?.find((t) => t.templateId === templateId);
  const mixedCategories = !audienceFilters.category && audience && Object.keys(audience.byCategory).length > 1;
  const mismatch = template && audienceFilters.category && template.audience && template.audience !== audienceFilters.category;

  async function sendTest() {
    setBusy("test");
    setError(null);
    setNotice(null);
    try {
      await api.sendBniEmail({ templateId, test: true });
      setNotice("Test email sent to your work email. It can take a minute to arrive.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function sendAll() {
    setBusy("send");
    setError(null);
    try {
      setResult(await api.sendBniEmail({ templateId, filters: audienceFilters, confirmCount: audience.total }));
    } catch (err) {
      setError(err.message);
      api.getBniEmailAudience(audienceFilters).then(setAudience, () => {});
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Email BNI members" size="lg">
      {result ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-success-soft p-4 text-success">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">
                Sending to {result.queued.toLocaleString("en-IN")} member{result.queued === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-foreground/80">
                Request <span className="font-mono">{result.requestId}</span>. Emails go out at about 8 a second.
              </p>
            </div>
          </div>
          {(result.skipped.duplicate > 0 || result.skipped.suppressed > 0 || result.skipped.invalid > 0) && (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {result.skipped.duplicate > 0 && <li>{result.skipped.duplicate} skipped: already received this email</li>}
              {result.skipped.suppressed > 0 && <li>{result.skipped.suppressed} skipped: unsubscribed, bounced or marked as spam before</li>}
              {result.skipped.invalid > 0 && <li>{result.skipped.invalid} skipped: email address not valid</li>}
            </ul>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Link to={`/bni/emails?request=${encodeURIComponent(result.requestId)}`}>
              <Button>Track this send</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recipients</p>
              <p className="mt-1 font-display text-2xl tabular-nums">
                {audience ? audience.total.toLocaleString("en-IN") : "…"}
              </p>
              <p className="text-xs text-muted-foreground">
                Members matching the current filters who have an email address
                {audienceFilters.category ? ` · ${CATEGORY_LABEL[audienceFilters.category]}` : " · all categories"}
              </p>
            </div>
            <div>
              <label htmlFor="bni-email-template" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Template
              </label>
              <Select id="bni-email-template" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="mt-1">
                {(templates ?? []).map((t) => (
                  <option key={t.templateId} value={t.templateId}>
                    {t.name}
                  </option>
                ))}
              </Select>
              {template && <p className="mt-1 truncate text-xs text-muted-foreground">Subject: {template.subject}</p>}
            </div>
          </div>

          {(mixedCategories || mismatch) && (
            <div className="flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-foreground/80">
                {mixedCategories
                  ? `These filters include ${Object.entries(audience.byCategory)
                      .map(([c, n]) => `${n} ${CATEGORY_LABEL[c]?.toLowerCase() ?? c}`)
                      .join(", ")}. Pick one category first so each group gets its own email.`
                  : `This template is written for ${template.audience}, but the filter is ${CATEGORY_LABEL[audienceFilters.category]?.toLowerCase()}.`}
              </p>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
              <span className="truncate">
                <span className="font-medium text-foreground">BeeBark</span> &lt;no-reply@thebeebark.com&gt; · {preview?.subject ?? "…"}
              </span>
              <span className="shrink-0 pl-2">Preview for “{PREVIEW_NAME}”</span>
            </div>
            {preview ? (
              <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="h-[28rem] w-full bg-white" />
            ) : (
              <div className="grid h-[28rem] place-items-center text-sm text-muted-foreground">Loading preview…</div>
            )}
          </div>

          {notice && <p className="text-sm text-success">{notice}</p>}
          {error && <p className="text-sm text-danger">{error}</p>}

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5" />
            <span>I've checked the preview and the test email. Members who already received this template, unsubscribed or bounced are skipped automatically.</span>
          </label>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={sendTest} disabled={!templateId || busy !== null}>
              {busy === "test" ? "Sending test…" : "Send test to me"}
            </Button>
            <Button onClick={sendAll} disabled={!templateId || !audience?.total || !checked || busy !== null}>
              <Send className="h-4 w-4" />
              {busy === "send"
                ? "Starting…"
                : `Send to ${audience ? audience.total.toLocaleString("en-IN") : "…"} member${audience?.total === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
