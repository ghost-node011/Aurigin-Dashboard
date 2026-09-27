import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Eye, EyeOff, Link2, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useHRData } from "../context/HRDataContext";
import { api } from "../lib/api";
import {
  ISSUE_TYPES,
  ISSUE_STATUSES,
  ISSUE_PRIORITIES,
  LINK_TYPES,
  formatMinutes,
  parseDuration,
  ACTIVE,
  BACKLOG,
  planningValue,
  planningChanges,
} from "../data/work";
import { useProjects } from "../hooks/useProjects";
import { Badge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Input, Select } from "../components/Input";
import { TypeIcon, PriorityIcon } from "../components/issues/IssueIcons";
import { RichText } from "../components/issues/RichText";
import { MentionTextarea } from "../components/issues/MentionTextarea";
import { AttachmentGrid, AttachmentUploader } from "../components/issues/Attachments";
import { CreateIssueModal } from "../components/issues/CreateIssueModal";
import { cn } from "../lib/cn";

const when = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** A full Jira-style issue view at /browse/KEY. */
export default function IssuePage() {
  const { issueKey } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const data = useHRData();
  const { projects } = useProjects();
  const [issue, setIssue] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [epics, setEpics] = useState([]);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [createChild, setCreateChild] = useState(false);
  // Edits go out one at a time: two quick changes (status, then a label)
  // would otherwise race, and whichever reply lands last would overwrite
  // the page with a copy missing the other change.
  const queue = useRef(Promise.resolve());

  const load = useCallback(
    () =>
      api.getIssue(issueKey).then(setIssue, (err) => {
        if (/not found/i.test(err.message)) setNotFound(true);
        else setError(err.message);
      }),
    [issueKey],
  );
  useEffect(() => {
    setIssue(null);
    setNotFound(false);
    load();
  }, [load]);

  const projectKey = issue?.projectKey;
  useEffect(() => {
    if (!projectKey) return;
    api.getSprints(projectKey).then((s) => setSprints(s.filter((x) => x.state !== "closed")), () => {});
    api.searchIssues({ project: projectKey, type: "Epic", sort: "created" }).then(setEpics, () => {});
  }, [projectKey]);

  if (notFound) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-xl">Issue {issueKey} doesn't exist</p>
        <Link to="/issues" className="mt-2 inline-block text-sm text-primary hover:underline">
          Search issues
        </Link>
      </div>
    );
  }
  if (!issue) return <p className="text-sm text-muted-foreground">{error ?? "Loading…"}</p>;

  function update(changes) {
    setError(null);
    const run = queue.current.then(async () => {
      try {
        setIssue(await api.updateIssue(issue.key, changes));
      } catch (err) {
        setError(err.message);
        throw err;
      }
    });
    queue.current = run.catch(() => {});
    return run;
  }
  const quiet = (changes) => update(changes).catch(() => {});

  const project = projects.find((p) => p.key === issue.projectKey);
  const watching = issue.watcherIds.includes(currentUser.id);
  const isSubtask = issue.type === "Sub-task";

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link to="/issues" className="hover:text-foreground">
          {project?.name ?? issue.projectKey}
        </Link>
        {issue.parent && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to={`/browse/${issue.parent.key}`} className="flex items-center gap-1 hover:text-foreground">
              <TypeIcon type={issue.parent.type} /> {issue.parent.key}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="flex items-center gap-1 text-foreground">
          <TypeIcon type={issue.type} /> {issue.key}
        </span>
      </nav>

      {error && <p className="rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-7">
          <InlineTitle value={issue.title} onSave={(title) => quiet({ title })} />

          <div className="flex flex-wrap gap-2">
            <AttachmentUploader
              label="Attach"
              onUploaded={async (files) => setIssue(await api.addAttachments(issue.key, files))}
            />
            {!isSubtask && (
              <Button size="sm" variant="outline" onClick={() => setCreateChild(true)}>
                <Plus className="h-3.5 w-3.5" /> {issue.type === "Epic" ? "Add issue to epic" : "Create sub-task"}
              </Button>
            )}
          </div>

          <Section title="Description">
            <InlineDescription value={issue.description} onSave={(description) => quiet({ description })} />
          </Section>

          {issue.attachments.length > 0 && (
            <Section title={`Attachments (${issue.attachments.length})`}>
              <AttachmentGrid
                attachments={issue.attachments}
                onRemove={async (a) => {
                  if (!confirm(`Remove ${a.name}?`)) return;
                  setIssue(await api.removeAttachment(issue.key, a.id));
                }}
              />
            </Section>
          )}

          {(issue.children.length > 0 || issue.type === "Epic") && (
            <Section title={issue.type === "Epic" ? "Issues in this epic" : "Sub-tasks"}>
              <ChildList items={issue.children} getEmployee={data.getEmployee} />
            </Section>
          )}

          <Section title="Linked issues">
            <Links issue={issue} onChange={setIssue} />
          </Section>

          <Activity issue={issue} getEmployee={data.getEmployee} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="flex items-center gap-2">
            <Select
              value={issue.status}
              onChange={(e) => quiet({ status: e.target.value })}
              className="h-9 w-auto font-medium"
              aria-label="Status"
            >
              {ISSUE_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const { watcherIds } = await api.watchIssue(issue.key, !watching);
                setIssue((i) => ({ ...i, watcherIds }));
              }}
              title={watching ? "Stop watching" : "Watch"}
            >
              {watching ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {issue.watcherIds.length}
            </Button>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 text-sm">
            <Detail label="Assignee">
              <PersonSelect value={issue.assigneeId} employees={data.employees} onChange={(v) => quiet({ assigneeId: v || null })} />
              {issue.assigneeId !== currentUser.id && (
                <button type="button" onClick={() => quiet({ assigneeId: currentUser.id })} className="mt-1 text-xs text-primary hover:underline">
                  Assign to me
                </button>
              )}
            </Detail>
            <Detail label="Reporters">
              <PeopleList
                ids={issue.reporterIds}
                employees={data.employees}
                getEmployee={data.getEmployee}
                onChange={(reporterIds) => quiet({ reporterIds })}
              />
            </Detail>
            <Detail label="Type">
              <Select value={issue.type} onChange={(e) => quiet({ type: e.target.value })} className="h-8 text-sm">
                {ISSUE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Detail>
            <Detail label="Priority">
              <div className="flex items-center gap-2">
                <PriorityIcon priority={issue.priority} />
                <Select value={issue.priority} onChange={(e) => quiet({ priority: e.target.value })} className="h-8 text-sm">
                  {ISSUE_PRIORITIES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              </div>
            </Detail>
            {!isSubtask && issue.type !== "Epic" && (
              <Detail label="Epic">
                <Select value={issue.parentId ?? ""} onChange={(e) => quiet({ parentId: e.target.value || null })} className="h-8 text-sm">
                  <option value="">None</option>
                  {epics.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.key} {ep.title}
                    </option>
                  ))}
                </Select>
              </Detail>
            )}
            {!isSubtask && issue.type !== "Epic" && (
              <Detail label="Planning">
                <Select value={planningValue(issue)} onChange={(e) => quiet(planningChanges(e.target.value))} className="h-8 text-sm">
                  <option value={ACTIVE}>Active task</option>
                  <option value={BACKLOG}>Backlog</option>
                  {issue.sprint?.state === "closed" && <option value={issue.sprint.id}>{issue.sprint.name} (closed)</option>}
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.state === "active" ? " (active)" : ""}
                    </option>
                  ))}
                </Select>
              </Detail>
            )}
            <Detail label="Labels">
              <LabelEditor labels={issue.labels} onChange={(labels) => quiet({ labels })} />
            </Detail>
            <Detail label="Story points">
              <BlurInput
                type="number"
                min="0"
                step="0.5"
                value={issue.storyPoints ?? ""}
                onCommit={(v) => quiet({ storyPoints: v === "" ? null : Number(v) })}
              />
            </Detail>
            <Detail label="Due date">
              <Input type="date" value={issue.dueDate ?? ""} onChange={(e) => quiet({ dueDate: e.target.value || null })} className="h-8 py-1 text-sm" />
            </Detail>
            <TimeTracking issue={issue} onUpdate={update} />
          </div>

          <p className="px-1 text-xs text-muted-foreground">
            Created {when(issue.createdAt)}
            <br />
            Updated {when(issue.updatedAt)}
            {issue.source === "ai" && (
              <>
                <br />
                Planned by AI from My Day
              </>
            )}
          </p>

          <button
            type="button"
            onClick={async () => {
              if (!confirm(`Delete ${issue.key}? Its sub-tasks and comments are deleted too. This can't be undone.`)) return;
              try {
                await api.deleteIssue(issue.key);
                navigate("/issues");
              } catch (err) {
                setError(err.message);
              }
            }}
            className="flex items-center gap-1.5 px-1 text-xs text-danger hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete issue
          </button>
        </aside>
      </div>

      <CreateIssueModal
        open={createChild}
        onClose={() => setCreateChild(false)}
        projects={projects}
        defaults={{
          projectKey: issue.projectKey,
          type: issue.type === "Epic" ? "Story" : "Sub-task",
          parentId: issue.type === "Epic" ? issue.id : issue.key,
          stayOnPage: true,
        }}
        onCreated={() => load()}
      />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Detail({ label, children }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-2">
      <span className="pt-1.5 text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** An input that saves when it loses focus or Enter is pressed, not on every keystroke. */
function BlurInput({ value, onCommit, ...props }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => String(draft) !== String(value) && onCommit(draft);
  return (
    <Input
      {...props}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className="h-8 py-1 text-sm"
    />
  );
}

function InlineTitle({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  if (!editing) {
    return (
      <h1
        onClick={() => setEditing(true)}
        className="cursor-text rounded-lg px-1 font-display text-2xl font-semibold hover:bg-surface-muted"
        title="Click to edit"
      >
        {value}
      </h1>
    );
  }
  const save = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== value) onSave(draft.trim());
    else setDraft(value);
  };
  return (
    <Input
      autoFocus
      value={draft}
      maxLength={255}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className="font-display text-2xl font-semibold"
    />
  );
}

function InlineDescription({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  if (!editing) {
    return (
      <div onClick={() => setEditing(true)} className="min-h-[3rem] cursor-text rounded-lg px-1 py-1 text-sm hover:bg-surface-muted">
        {value ? <RichText text={value} /> : <span className="text-muted-foreground">Add a description…</span>}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <MentionTextarea autoFocus rows={8} value={draft} onChange={setDraft} placeholder="Type @ to mention someone." />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            setEditing(false);
            if (draft !== value) onSave(draft);
          }}
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setDraft(value);
            setEditing(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function PersonSelect({ value, employees, onChange }) {
  return (
    <Select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm">
      <option value="">Unassigned</option>
      {employees.map((e) => (
        <option key={e.id} value={e.id}>
          {e.name}
        </option>
      ))}
    </Select>
  );
}

function PeopleList({ ids, employees, getEmployee, onChange }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-1.5">
      {ids.map((id) => {
        const e = getEmployee(id);
        return (
          <div key={id} className="group flex items-center gap-2">
            <Avatar employee={e} size="sm" />
            <span className="flex-1 truncate">{e?.name ?? id}</span>
            <button
              type="button"
              onClick={() => onChange(ids.filter((x) => x !== id))}
              className="text-muted-foreground opacity-0 transition hover:text-danger group-hover:opacity-100"
              aria-label={`Remove ${e?.name ?? id}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
      {adding ? (
        <Select
          autoFocus
          value=""
          onBlur={() => setAdding(false)}
          onChange={(e) => {
            setAdding(false);
            if (e.target.value) onChange([...ids, e.target.value]);
          }}
          className="h-8 text-sm"
        >
          <option value="">Pick someone…</option>
          {employees
            .filter((e) => !ids.includes(e.id))
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
        </Select>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="text-xs text-primary hover:underline">
          + Add reporter
        </button>
      )}
    </div>
  );
}

function LabelEditor({ labels, onChange }) {
  const [draft, setDraft] = useState("");
  const [known, setKnown] = useState([]);
  useEffect(() => {
    api.getIssueLabels().then(setKnown, () => {});
  }, []);
  const add = () => {
    const label = draft.trim().replace(/\s+/g, "-");
    setDraft("");
    if (label && !labels.includes(label)) onChange([...labels, label]);
  };
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {labels.map((l) => (
          <span key={l} className="inline-flex items-center gap-1 rounded bg-surface-muted px-1.5 py-0.5 text-xs">
            {l}
            <button type="button" onClick={() => onChange(labels.filter((x) => x !== l))} aria-label={`Remove ${l}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        list="issue-labels"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder="Add label"
        className="h-8 py-1 text-sm"
      />
      <datalist id="issue-labels">
        {known.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
    </div>
  );
}

function TimeTracking({ issue, onUpdate }) {
  const [logging, setLogging] = useState(false);
  const [spent, setSpent] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState(null);
  const remaining = issue.remainingMinutes ?? Math.max(0, issue.estimateMinutes - issue.timeSpentMinutes);
  const total = Math.max(issue.timeSpentMinutes + remaining, 1);

  async function log(e) {
    e.preventDefault();
    const minutes = parseDuration(spent);
    if (!minutes) return setError('Enter time like "1h 30m" or "45m".');
    try {
      await onUpdate({ logMinutes: minutes, note });
      setSpent("");
      setNote("");
      setLogging(false);
      setError(null);
    } catch {
      // Shown by the page.
    }
  }

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <p className="text-xs text-muted-foreground">Time tracking</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${(issue.timeSpentMinutes / total) * 100}%` }} />
      </div>
      <p className="flex justify-between text-xs">
        <span>{formatMinutes(issue.timeSpentMinutes)} logged</span>
        <span className="text-muted-foreground">{formatMinutes(remaining)} remaining</span>
      </p>
      <Detail label="Estimate">
        <BlurInput
          value={issue.estimateMinutes ? formatMinutes(issue.estimateMinutes) : ""}
          placeholder="e.g. 4h"
          onCommit={(v) => {
            const m = parseDuration(v);
            if (m != null) onUpdate({ estimateMinutes: m }).catch(() => {});
          }}
        />
      </Detail>
      {logging ? (
        <form onSubmit={log} className="space-y-2">
          <Input autoFocus value={spent} onChange={(e) => setSpent(e.target.value)} placeholder="Time spent, e.g. 1h 30m" className="h-8 py-1 text-sm" />
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you work on?" className="h-8 py-1 text-sm" />
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" type="submit">
              Log
            </Button>
            <Button size="sm" variant="outline" type="button" onClick={() => setLogging(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setLogging(true)} className="text-xs text-primary hover:underline">
          + Log work
        </button>
      )}
    </div>
  );
}

function ChildList({ items: children, getEmployee }) {
  if (children.length === 0) return <p className="text-sm text-muted-foreground">Nothing here yet.</p>;
  const done = children.filter((c) => c.status === "Done").length;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full bg-success" style={{ width: `${(done / children.length) * 100}%` }} />
        </div>
        <span className="text-xs text-muted-foreground">
          {done}/{children.length} done
        </span>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {children.map((c) => (
          <IssueLine key={c.id} issue={c} getEmployee={getEmployee} />
        ))}
      </ul>
    </div>
  );
}

function IssueLine({ issue, getEmployee, trailing }) {
  return (
    <li className="flex items-center gap-2.5 px-3 py-2 text-sm">
      <TypeIcon type={issue.type} />
      <Link to={`/browse/${issue.key}`} className="shrink-0 font-mono text-xs text-muted-foreground hover:text-primary">
        {issue.key}
      </Link>
      <Link to={`/browse/${issue.key}`} className={cn("min-w-0 flex-1 truncate hover:text-primary", issue.status === "Done" && "line-through opacity-70")}>
        {issue.title}
      </Link>
      <PriorityIcon priority={issue.priority} />
      {issue.assigneeId && <Avatar employee={getEmployee?.(issue.assigneeId)} size="sm" />}
      <Badge>{issue.status}</Badge>
      {trailing}
    </li>
  );
}

function Links({ issue, onChange }) {
  const { getEmployee } = useHRData();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState("relates to");
  const [key, setKey] = useState("");
  const [error, setError] = useState(null);

  async function add(e) {
    e.preventDefault();
    setError(null);
    try {
      onChange(await api.addIssueLink(issue.key, type, key.trim().toUpperCase()));
      setKey("");
      setAdding(false);
    } catch (err) {
      setError(err.message);
    }
  }

  const grouped = LINK_TYPES.map((t) => [t, issue.links.filter((l) => l.type === t)]).filter(([, list]) => list.length);

  return (
    <div className="space-y-3">
      {grouped.map(([t, list]) => (
        <div key={t}>
          <p className="mb-1 text-xs text-muted-foreground">{t}</p>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {list.map((l) => (
              <IssueLine
                key={l.id}
                issue={l.issue}
                getEmployee={getEmployee}
                trailing={
                  <button
                    type="button"
                    onClick={async () => onChange(await api.removeIssueLink(issue.key, l.id))}
                    className="text-muted-foreground hover:text-danger"
                    aria-label="Remove link"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                }
              />
            ))}
          </ul>
        </div>
      ))}
      {adding ? (
        <form onSubmit={add} className="flex flex-wrap items-center gap-2">
          <Select value={type} onChange={(e) => setType(e.target.value)} className="h-8 w-44 text-sm">
            {LINK_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
          <Input autoFocus value={key} onChange={(e) => setKey(e.target.value)} placeholder="Issue key, e.g. WEB-4" className="h-8 w-40 py-1 text-sm" />
          <Button size="sm" type="submit" disabled={!key.trim()}>
            Link
          </Button>
          <Button size="sm" variant="outline" type="button" onClick={() => setAdding(false)}>
            Cancel
          </Button>
          {error && <p className="w-full text-sm text-danger">{error}</p>}
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1 text-sm text-primary hover:underline">
          <Link2 className="h-3.5 w-3.5" /> Link an issue
        </button>
      )}
    </div>
  );
}

function Activity({ issue, getEmployee }) {
  const [tab, setTab] = useState("comments");
  const worklogs = issue.activity.filter((a) => a.type === "worklog");
  return (
    <section>
      <div className="mb-4 flex gap-1 border-b border-border">
        {[
          ["comments", "Comments"],
          ["history", "History"],
          ["worklog", `Work log (${worklogs.length})`],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition",
              tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "comments" && <Comments issueKey={issue.key} getEmployee={getEmployee} />}
      {tab === "history" && <History entries={[...issue.activity].reverse()} getEmployee={getEmployee} />}
      {tab === "worklog" &&
        (worklogs.length ? (
          <History entries={[...worklogs].reverse()} getEmployee={getEmployee} />
        ) : (
          <p className="text-sm text-muted-foreground">No work logged yet.</p>
        ))}
    </section>
  );
}

function History({ entries, getEmployee }) {
  return (
    <ul className="space-y-3">
      {entries.map((a, i) => {
        const who = a.by ? getEmployee(a.by) : null;
        return (
          <li key={i} className="flex gap-3 text-sm">
            {who ? (
              <Avatar employee={who} size="sm" />
            ) : (
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
                AI
              </span>
            )}
            <div className="min-w-0">
              <p>
                <span className="font-medium">{who?.name ?? "AI"}</span>{" "}
                <span className="text-muted-foreground">{when(a.at)}</span>
              </p>
              <p className="text-muted-foreground">
                {a.text || (a.type === "worklog" ? "Logged work" : "")}
                {a.minutes > 0 && ` · ${formatMinutes(a.minutes)}`}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Comments({ issueKey, getEmployee }) {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState(null);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // { id, body }

  useEffect(() => {
    api.getComments(issueKey).then(setComments, (err) => setError(err.message));
  }, [issueKey]);

  async function submit(e) {
    e.preventDefault();
    if (!draft.trim() && !files.length) return;
    setBusy(true);
    setError(null);
    try {
      const comment = await api.addComment(issueKey, draft.trim(), files);
      setComments((c) => [...c, comment]);
      setDraft("");
      setFiles([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="flex gap-3">
        <Avatar employee={currentUser} size="sm" />
        <div className="min-w-0 flex-1 space-y-2">
          <MentionTextarea rows={3} value={draft} onChange={setDraft} placeholder="Add a comment… Type @ to mention someone." />
          <AttachmentGrid attachments={files} compact onRemove={(a) => setFiles((f) => f.filter((x) => x.publicId !== a.publicId))} />
          <div className="flex items-center gap-2">
            <Button size="sm" type="submit" disabled={busy || (!draft.trim() && !files.length)}>
              Save
            </Button>
            <AttachmentUploader label="Attach" onUploaded={(up) => setFiles((f) => [...f, ...up])} />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </form>

      {comments === null ? (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      ) : (
        <ul className="space-y-5">
          {[...comments].reverse().map((c) => {
            const author = getEmployee(c.authorId);
            const mine = c.authorId === currentUser.id;
            return (
              <li key={c.id} className="flex gap-3">
                <Avatar employee={author} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{author?.name ?? c.authorId}</span>{" "}
                    <span className="text-muted-foreground">
                      {when(c.createdAt)}
                      {c.editedAt && " (edited)"}
                    </span>
                  </p>
                  {editing?.id === c.id ? (
                    <div className="mt-1 space-y-2">
                      <MentionTextarea rows={3} value={editing.body} onChange={(body) => setEditing({ ...editing, body })} />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            const updated = await api.updateComment(c.id, editing.body);
                            setComments((list) => list.map((x) => (x.id === c.id ? updated : x)));
                            setEditing(null);
                          }}
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <RichText text={c.body} className="mt-1 text-sm" />
                  )}
                  {c.attachments.length > 0 && (
                    <div className="mt-2">
                      <AttachmentGrid attachments={c.attachments} compact />
                    </div>
                  )}
                  {(mine || ["admin", "hr"].includes(currentUser.role)) && editing?.id !== c.id && (
                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                      {mine && (
                        <button type="button" onClick={() => setEditing({ id: c.id, body: c.body })} className="hover:text-foreground">
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm("Delete this comment?")) return;
                          await api.deleteComment(c.id);
                          setComments((list) => list.filter((x) => x.id !== c.id));
                        }}
                        className="hover:text-danger"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
