import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useHRData } from "../../context/HRDataContext";
import { api } from "../../lib/api";
import { ISSUE_TYPES, ISSUE_PRIORITIES, parseDuration } from "../../data/work";
import { Modal } from "../Modal";
import { Button } from "../Button";
import { Field, Input, Select } from "../Input";
import { MentionTextarea } from "./MentionTextarea";
import { AttachmentGrid, AttachmentUploader } from "./Attachments";

/**
 * Jira's "Create issue" dialog. `defaults` pre-fills fields — e.g. a
 * sub-task from its parent's page, or the sprint a backlog section is for.
 */
export function CreateIssueModal({ open, onClose, projects, defaults = {}, onCreated }) {
  const { currentUser } = useAuth();
  const { employees } = useHRData();
  const navigate = useNavigate();
  const blank = () => ({
    projectKey: defaults.projectKey ?? projects[0]?.key ?? "",
    type: defaults.type ?? "Task",
    title: "",
    description: "",
    assigneeId: defaults.assigneeId ?? currentUser.id,
    priority: "Medium",
    labels: "",
    storyPoints: "",
    estimate: "",
    dueDate: "",
    parentId: defaults.parentId ?? "",
    sprintId: defaults.sprintId ?? "",
  });
  const [form, setForm] = useState(blank);
  const [attachments, setAttachments] = useState([]);
  const [epics, setEpics] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Re-seed whenever the dialog opens, so defaults from the caller apply.
  useEffect(() => {
    if (open) {
      setForm(blank());
      setAttachments([]);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !form.projectKey) return;
    api.searchIssues({ project: form.projectKey, type: "Epic", sort: "created" }).then(setEpics, () => setEpics([]));
    api.getSprints(form.projectKey).then((s) => setSprints(s.filter((x) => x.state !== "closed")), () => setSprints([]));
  }, [open, form.projectKey]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isSubtask = form.type === "Sub-task";

  async function handleSubmit(e, createAnother = false) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const estimateMinutes = parseDuration(form.estimate);
    if (estimateMinutes == null) return setError('Estimate should look like "2h 30m", "45m" or "3h".');
    setBusy(true);
    setError(null);
    try {
      const issue = await api.addIssue({
        ...form,
        labels: form.labels.split(",").map((l) => l.trim()).filter(Boolean),
        storyPoints: form.storyPoints === "" ? null : Number(form.storyPoints),
        estimateMinutes,
        parentId: form.type === "Epic" ? null : form.parentId || null,
        sprintId: isSubtask || form.type === "Epic" ? null : form.sprintId || null,
        dueDate: form.dueDate || null,
        attachments,
      });
      onCreated?.(issue);
      if (createAnother) {
        setForm((f) => ({ ...blank(), projectKey: f.projectKey, type: f.type, sprintId: f.sprintId, parentId: f.parentId }));
        setAttachments([]);
      } else {
        onClose();
        if (!defaults.stayOnPage) navigate(`/browse/${issue.key}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create issue" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Project" required>
            <Select value={form.projectKey} onChange={set("projectKey")} disabled={Boolean(defaults.parentId)}>
              {projects.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name} ({p.key})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Issue type" required>
            <Select value={form.type} onChange={set("type")}>
              {ISSUE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Summary" required>
          <Input value={form.title} onChange={set("title")} maxLength={255} autoFocus placeholder="What needs to be done?" />
        </Field>
        <Field label="Description">
          <MentionTextarea
            rows={5}
            value={form.description}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder="Add details. Type @ to mention someone."
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Assignee">
            <Select value={form.assigneeId} onChange={set("assigneeId")}>
              <option value="">Unassigned</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={set("priority")}>
              {ISSUE_PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Due date">
            <Input type="date" value={form.dueDate} onChange={set("dueDate")} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {form.type !== "Epic" && (
            <Field label={isSubtask ? "Parent issue" : "Epic"} required={isSubtask}>
              {isSubtask ? (
                <Input value={form.parentId} onChange={set("parentId")} placeholder="e.g. WEB-12" disabled={Boolean(defaults.parentId)} />
              ) : (
                <Select value={form.parentId} onChange={set("parentId")}>
                  <option value="">None</option>
                  {epics.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.key} {ep.title}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          {!isSubtask && form.type !== "Epic" && (
            <Field label="Sprint">
              <Select value={form.sprintId} onChange={set("sprintId")}>
                <option value="">Backlog</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.state === "active" ? " (active)" : ""}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Story points">
            <Input type="number" min="0" step="0.5" value={form.storyPoints} onChange={set("storyPoints")} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Labels">
            <Input value={form.labels} onChange={set("labels")} placeholder="frontend, urgent" />
          </Field>
          <Field label="Original estimate">
            <Input value={form.estimate} onChange={set("estimate")} placeholder="e.g. 2h 30m" />
          </Field>
        </div>

        <Field label="Attachments">
          <div className="space-y-3">
            <AttachmentGrid
              attachments={attachments}
              compact
              onRemove={(a) => setAttachments((list) => list.filter((x) => x.publicId !== a.publicId))}
            />
            <AttachmentUploader dropzone onUploaded={(files) => setAttachments((list) => [...list, ...files])} />
          </div>
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={(e) => handleSubmit(e, true)} disabled={!form.title.trim() || busy}>
            Create another
          </Button>
          <Button type="submit" disabled={!form.title.trim() || busy}>
            {busy ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
