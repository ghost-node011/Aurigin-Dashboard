import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Save, Search, Trash2, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useHRData } from "../context/HRDataContext";
import { api } from "../lib/api";
import { formatMonthDay } from "../lib/date";
import { ISSUE_TYPES, ISSUE_STATUSES, ISSUE_PRIORITIES } from "../data/work";
import { useProjects } from "../hooks/useProjects";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Input, Select } from "../components/Input";
import { TypeIcon, PriorityIcon } from "../components/issues/IssueIcons";
import { CreateIssueModal } from "../components/issues/CreateIssueModal";
import { cn } from "../lib/cn";

// The URL is the search: every filter is a query param, so a search can be
// bookmarked, shared as a link or saved as a filter.
const PARAMS = ["project", "type", "status", "priority", "assignee", "reporter", "watcher", "label", "sprint", "text", "sort"];

const BUILT_IN = [
  { name: "My open issues", query: { assignee: "me", status: "To Do,In Progress,In Review,Blocked" } },
  { name: "Reported by me", query: { reporter: "me" } },
  { name: "Watching", query: { watcher: "me" } },
  { name: "Open bugs", query: { type: "Bug", status: "To Do,In Progress,In Review,Blocked" } },
  { name: "Recently updated", query: { sort: "updated" } },
];

export default function Issues() {
  const { currentUser } = useAuth();
  const data = useHRData();
  const { projects } = useProjects();
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => Object.fromEntries(PARAMS.map((p) => [p, params.get(p) ?? ""])), [params]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [text, setText] = useState(query.text);
  const [filters, setFilters] = useState([]);
  const [labels, setLabels] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkNote, setBulkNote] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setResults(null);
    setError(null);
    setSelected(new Set());
    api.searchIssues({ sort: "updated", ...query }).then(
      (r) => !cancelled && setResults(r),
      (err) => !cancelled && setError(err.message),
    );
    return () => {
      cancelled = true;
    };
  }, [query, reload]);

  useEffect(() => {
    api.getFilters().then(setFilters, () => {});
    api.getIssueLabels().then(setLabels, () => {});
  }, []);

  useEffect(() => {
    if (!query.project || query.project.includes(",")) return setSprints([]);
    api.getSprints(query.project).then(setSprints, () => setSprints([]));
  }, [query.project]);

  // Debounce the text box into the URL.
  useEffect(() => {
    const t = setTimeout(() => text !== query.text && setParam("text", text), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  function applyQuery(q) {
    setText(q.text ?? "");
    setParams(new URLSearchParams(Object.fromEntries(Object.entries(q).filter(([, v]) => v))));
  }

  async function saveFilter() {
    const name = prompt("Name this filter");
    if (!name?.trim()) return;
    const shared = confirm("Share it with everyone? (Cancel keeps it private.)");
    const active = Object.fromEntries(Object.entries(query).filter(([, v]) => v));
    try {
      const f = await api.addFilter({ name: name.trim(), query: active, shared });
      setFilters((list) => [...list, f].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError(err.message);
    }
  }

  const activeCount = Object.entries(query).filter(([k, v]) => v && k !== "sort").length;

  // Sprints only make sense within one project.
  const selectedIssues = (results ?? []).filter((i) => selected.has(i.id));
  const oneProject = new Set(selectedIssues.map((i) => i.projectKey)).size === 1 ? selectedIssues[0]?.projectKey : null;

  async function bulk(changes) {
    setBulkBusy(true);
    setBulkNote(null);
    try {
      const { updated, results: rs } = await api.bulkUpdateIssues([...selected], changes);
      const failed = rs.filter((r) => !r.ok);
      setBulkNote(
        failed.length
          ? `Updated ${updated}. Couldn't update ${failed.map((f) => `${f.key ?? f.id} (${f.error})`).join(", ")}.`
          : `Updated ${updated} issue${updated === 1 ? "" : "s"}.`,
      );
      setReload((n) => n + 1);
    } catch (err) {
      setBulkNote(err.message);
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Issues</h1>
          <p className="mt-1 text-sm text-muted-foreground">Search and filter work across every project.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Create
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="space-y-5">
          <FilterGroup title="Filters">
            {BUILT_IN.map((f) => (
              <FilterLink key={f.name} onClick={() => applyQuery(f.query)}>
                {f.name}
              </FilterLink>
            ))}
            <FilterLink onClick={() => applyQuery({})}>All issues</FilterLink>
          </FilterGroup>
          {filters.length > 0 && (
            <FilterGroup title="Saved filters">
              {filters.map((f) => (
                <div key={f.id} className="group flex items-center">
                  <FilterLink onClick={() => applyQuery(f.query)}>
                    {f.name}
                    {f.shared && <Users className="ml-1 inline h-3 w-3 text-muted-foreground" />}
                  </FilterLink>
                  {f.ownerId === currentUser.id && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`Delete filter "${f.name}"?`)) return;
                        await api.deleteFilter(f.id);
                        setFilters((list) => list.filter((x) => x.id !== f.id));
                      }}
                      className="ml-auto text-muted-foreground opacity-0 hover:text-danger group-hover:opacity-100"
                      aria-label={`Delete ${f.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </FilterGroup>
          )}
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search text or key" className="h-9 py-1.5 pl-9" />
            </div>
            <FilterSelect label="Project" value={query.project} onChange={(v) => setParam("project", v)}>
              {projects.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Type" value={query.type} onChange={(v) => setParam("type", v)} options={ISSUE_TYPES} />
            <FilterSelect
              label="Status"
              value={query.status}
              onChange={(v) => setParam("status", v)}
              options={ISSUE_STATUSES}
              extra={<option value="To Do,In Progress,In Review,Blocked">Not done</option>}
            />
            <FilterSelect label="Priority" value={query.priority} onChange={(v) => setParam("priority", v)} options={ISSUE_PRIORITIES} />
            <FilterSelect label="Assignee" value={query.assignee} onChange={(v) => setParam("assignee", v)}>
              <option value="me">Me</option>
              <option value="unassigned">Unassigned</option>
              {data.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Reporter" value={query.reporter} onChange={(v) => setParam("reporter", v)}>
              <option value="me">Me</option>
              {data.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </FilterSelect>
            {labels.length > 0 && <FilterSelect label="Label" value={query.label} onChange={(v) => setParam("label", v)} options={labels} />}
            <FilterSelect label="Sprint" value={query.sprint} onChange={(v) => setParam("sprint", v)}>
              <option value="active">Active sprints</option>
              <option value="backlog">Backlog (no sprint)</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </FilterSelect>
            <Select value={query.sort || "updated"} onChange={(e) => setParam("sort", e.target.value)} className="h-9 w-40" aria-label="Sort">
              <option value="updated">Recently updated</option>
              <option value="created">Newest first</option>
              <option value="due">Due date</option>
              <option value="rank">Rank</option>
            </Select>
            {activeCount > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={saveFilter} className="h-9">
                  <Save className="h-3.5 w-3.5" /> Save filter
                </Button>
                <button type="button" onClick={() => applyQuery({})} className="text-sm text-muted-foreground hover:text-foreground">
                  Clear
                </button>
              </>
            )}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-3 py-2 text-sm">
              <span className="font-medium">{selected.size} selected</span>
              <BulkSelect label="Set status" disabled={bulkBusy} onPick={(v) => bulk({ status: v })} options={ISSUE_STATUSES.map((s) => [s, s])} />
              <BulkSelect label="Set priority" disabled={bulkBusy} onPick={(v) => bulk({ priority: v })} options={ISSUE_PRIORITIES.map((p) => [p, p])} />
              <BulkSelect
                label="Assign to"
                disabled={bulkBusy}
                onPick={(v) => bulk({ assigneeId: v === "none" ? null : v })}
                options={[["none", "Unassigned"], ...data.employees.map((e) => [e.id, e.name])]}
              />
              {oneProject && (
                <BulkSprintSelect projectKey={oneProject} disabled={bulkBusy} onPick={(v) => bulk({ sprintId: v === "backlog" ? null : v })} />
              )}
              <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
                Clear selection
              </button>
            </div>
          )}
          {bulkNote && <p className="text-sm text-muted-foreground">{bulkNote}</p>}

          <Card className="overflow-hidden" title={results ? `${results.length} issue${results.length === 1 ? "" : "s"}` : "Searching…"}>
            {results && results.length === 0 && <p className="text-sm text-muted-foreground">No issues match these filters.</p>}
            {results && results.length > 0 && (
              <div className="-m-5 overflow-x-auto">
                <table className="w-full min-w-[48rem] text-sm">
                  <thead className="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="w-8 py-2 pl-4">
                        <input
                          type="checkbox"
                          aria-label="Select all"
                          checked={results.length > 0 && selected.size === results.length}
                          onChange={(e) => setSelected(e.target.checked ? new Set(results.map((i) => i.id)) : new Set())}
                          className="h-4 w-4 accent-primary"
                        />
                      </th>
                      <th className="px-4 py-2 font-medium">Key</th>
                      <th className="px-2 py-2 font-medium">Summary</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                      <th className="px-2 py-2 font-medium">Assignee</th>
                      <th className="px-2 py-2 font-medium">Due</th>
                      <th className="px-4 py-2 text-right font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((i) => {
                      const assignee = data.getEmployee(i.assigneeId);
                      return (
                        <tr
                          key={i.id}
                          className={cn("border-b border-border last:border-b-0 hover:bg-surface-muted/60", selected.has(i.id) && "bg-primary-soft/50")}
                        >
                          <td className="py-2 pl-4">
                            <input
                              type="checkbox"
                              aria-label={`Select ${i.key}`}
                              checked={selected.has(i.id)}
                              onChange={(e) =>
                                setSelected((s) => {
                                  const next = new Set(s);
                                  if (e.target.checked) next.add(i.id);
                                  else next.delete(i.id);
                                  return next;
                                })
                              }
                              className="h-4 w-4 accent-primary"
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-2">
                            <Link to={`/browse/${i.key}`} className="flex items-center gap-2 font-mono text-xs hover:text-primary">
                              <TypeIcon type={i.type} /> {i.key}
                            </Link>
                          </td>
                          <td className="max-w-md px-2 py-2">
                            <Link to={`/browse/${i.key}`} className={cn("flex items-center gap-2 hover:text-primary", i.status === "Done" && "line-through opacity-70")}>
                              <PriorityIcon priority={i.priority} />
                              <span className="truncate">{i.title}</span>
                            </Link>
                          </td>
                          <td className="px-2 py-2">
                            <Badge>{i.status}</Badge>
                          </td>
                          <td className="px-2 py-2">
                            {assignee ? (
                              <span className="flex items-center gap-2">
                                <Avatar employee={assignee} size="sm" /> <span className="truncate">{assignee.name}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Unassigned</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-muted-foreground">{i.dueDate ? formatMonthDay(i.dueDate) : ""}</td>
                          <td className="whitespace-nowrap px-4 py-2 text-right text-muted-foreground">{formatMonthDay(i.updatedAt.slice(0, 10))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      <CreateIssueModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projects={projects}
        defaults={{ projectKey: query.project && !query.project.includes(",") ? query.project : undefined }}
      />
    </div>
  );
}

function FilterGroup({ title, children }) {
  return (
    <div>
      <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function FilterLink({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-muted">
      {children}
    </button>
  );
}

function FilterSelect({ label, value, onChange, options, extra, children }) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("h-9 w-auto max-w-[11rem]", value && "border-primary text-primary")}
      aria-label={label}
    >
      <option value="">{label}: all</option>
      {extra}
      {options?.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
      {children}
    </Select>
  );
}

function BulkSelect({ label, options, onPick, disabled }) {
  return (
    <Select
      value=""
      disabled={disabled}
      onChange={(e) => e.target.value && onPick(e.target.value)}
      className="h-8 w-auto bg-surface text-sm"
      aria-label={label}
    >
      <option value="">{label}…</option>
      {options.map(([value, text]) => (
        <option key={value} value={value}>
          {text}
        </option>
      ))}
    </Select>
  );
}

function BulkSprintSelect({ projectKey, onPick, disabled }) {
  const [sprints, setSprints] = useState([]);
  useEffect(() => {
    api.getSprints(projectKey).then((s) => setSprints(s.filter((x) => x.state !== "closed")), () => setSprints([]));
  }, [projectKey]);
  return (
    <BulkSelect
      label="Move to"
      disabled={disabled}
      onPick={onPick}
      options={[["backlog", "Backlog"], ...sprints.map((s) => [s.id, s.name + (s.state === "active" ? " (active)" : "")])]}
    />
  );
}
