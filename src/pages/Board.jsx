import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useHRData } from "../context/HRDataContext";
import { api } from "../lib/api";
import { formatMonthDay, todayISO } from "../lib/date";
import { ISSUE_STATUSES } from "../data/work";
import { useProjects } from "../hooks/useProjects";
import { Badge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Input, Select } from "../components/Input";
import { TypeIcon, PriorityIcon } from "../components/issues/IssueIcons";
import { ProjectPicker } from "../components/issues/ProjectPicker";
import { CreateIssueModal } from "../components/issues/CreateIssueModal";
import { CompleteSprintModal } from "../components/issues/SprintModals";
import { cn } from "../lib/cn";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The project board. With an active sprint it shows that sprint (Scrum);
 * without one it shows every open issue in the project (Kanban). Drag a
 * card between columns to change its status.
 */
export default function Board() {
  const { currentUser } = useAuth();
  const data = useHRData();
  const navigate = useNavigate();
  const { projects, current, setProjectKey, error: projectError } = useProjects();
  const [sprint, setSprint] = useState(undefined); // undefined = loading, null = none active
  const [futureSprints, setFutureSprints] = useState([]);
  const [issues, setIssues] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [recent, setRecent] = useState(false);
  const [label, setLabel] = useState("");
  const [swimlanes, setSwimlanes] = useState("none");
  const [dragOver, setDragOver] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const load = useCallback(async () => {
    if (!current) return;
    setError(null);
    try {
      const sprints = await api.getSprints(current.key);
      const active = sprints.find((s) => s.state === "active") ?? null;
      setSprint(active);
      setFutureSprints(sprints.filter((s) => s.state === "future"));
      setIssues(
        await api.searchIssues(active ? { project: current.key, sprint: active.id } : { project: current.key, sort: "rank" }),
      );
    } catch (err) {
      setError(err.message);
    }
  }, [current]);

  useEffect(() => {
    setIssues(null);
    setSprint(undefined);
    load();
  }, [load]);

  const labels = useMemo(() => [...new Set((issues ?? []).flatMap((i) => i.labels))].sort(), [issues]);
  const epicsById = useMemo(
    () => new Map((issues ?? []).filter((i) => i.type === "Epic").map((e) => [e.id, e])),
    [issues],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    return (issues ?? []).filter(
      (i) =>
        i.type !== "Epic" &&
        // Kanban mode hides long-finished work so Done doesn't grow forever.
        (sprint || i.status !== "Done" || now - new Date(i.updatedAt).getTime() < 14 * DAY_MS) &&
        (!onlyMine || i.assigneeId === currentUser.id) &&
        (!recent || now - new Date(i.updatedAt).getTime() < 7 * DAY_MS) &&
        (!label || i.labels.includes(label)) &&
        (!q || i.title.toLowerCase().includes(q) || i.key.toLowerCase().includes(q)),
    );
  }, [issues, sprint, query, onlyMine, recent, label, currentUser.id]);

  const lanes = useMemo(() => {
    if (swimlanes === "none") return [{ id: "all", title: null, issues: visible }];
    const groups = new Map();
    for (const issue of visible) {
      const id = swimlanes === "assignee" ? issue.assigneeId ?? "none" : issue.parentId ?? "none";
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(issue);
    }
    return [...groups.entries()]
      .map(([id, list]) => {
        let title;
        if (swimlanes === "assignee") title = id === "none" ? "Unassigned" : data.getEmployee(id)?.name ?? id;
        else {
          const epic = epicsById.get(id);
          title = id === "none" ? "No epic" : epic ? `${epic.key} ${epic.title}` : "Sub-tasks of other issues";
        }
        return { id, title, issues: list };
      })
      .sort((a, b) => (a.id === "none") - (b.id === "none") || a.title.localeCompare(b.title));
  }, [visible, swimlanes, data, epicsById]);

  function onDrop(status, e) {
    e.preventDefault();
    setDragOver(null);
    const issue = issues.find((i) => i.id === e.dataTransfer.getData("text/plain"));
    if (!issue || issue.status === status) return;
    const previous = issues;
    setIssues((list) => list.map((i) => (i.id === issue.id ? { ...i, status, updatedAt: new Date().toISOString() } : i)));
    setError(null);
    api.updateIssue(issue.key, { status }).catch((err) => {
      setIssues(previous);
      setError(err.message);
    });
  }

  if (projectError) return <p className="text-sm text-danger">{projectError}</p>;
  if (!current) return <p className="text-sm text-muted-foreground">Loading projects…</p>;

  const daysLeft = sprint?.endDate ? Math.ceil((new Date(sprint.endDate + "T23:59:59") - new Date()) / DAY_MS) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{current.name} board</p>
          <h1 className="font-display text-3xl font-semibold">{sprint ? sprint.name : "Kanban"}</h1>
          {sprint?.goal && <p className="mt-1 text-sm text-muted-foreground">{sprint.goal}</p>}
          {sprint === null && (
            <p className="mt-1 text-sm text-muted-foreground">
              No active sprint — showing all open work.{" "}
              <Link to="/backlog" className="text-primary hover:underline">
                Plan a sprint in the backlog
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sprint && (
            <>
              {daysLeft != null && (
                <span className="text-sm text-muted-foreground">
                  {daysLeft >= 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : `${-daysLeft} days over`}
                </span>
              )}
              <Button variant="outline" onClick={() => setCompleteOpen(true)}>
                Complete sprint
              </Button>
            </>
          )}
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ProjectPicker projects={projects} current={current} onChange={setProjectKey} />
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this board" className="h-9 py-1.5 pl-9" />
        </div>
        <QuickFilter active={onlyMine} onClick={() => setOnlyMine((v) => !v)}>
          Only my issues
        </QuickFilter>
        <QuickFilter active={recent} onClick={() => setRecent((v) => !v)}>
          Recently updated
        </QuickFilter>
        {labels.length > 0 && (
          <Select value={label} onChange={(e) => setLabel(e.target.value)} className="h-9 w-40" aria-label="Label">
            <option value="">All labels</option>
            {labels.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </Select>
        )}
        <Select value={swimlanes} onChange={(e) => setSwimlanes(e.target.value)} className="h-9 w-44" aria-label="Group by">
          <option value="none">No swimlanes</option>
          <option value="assignee">Group by assignee</option>
          <option value="epic">Group by epic</option>
        </Select>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!issues && !error && <p className="text-sm text-muted-foreground">Loading the board…</p>}

      {issues && (
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="min-w-[68rem] space-y-6">
            <div className="grid grid-cols-5 gap-3">
              {ISSUE_STATUSES.map((status) => (
                <div key={status} className="flex items-center justify-between px-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{status}</span>
                  <span className="text-xs text-muted-foreground">{visible.filter((i) => i.status === status).length}</span>
                </div>
              ))}
            </div>
            {lanes.map((lane) => (
              <div key={lane.id}>
                {lane.title && (
                  <p className="mb-2 text-sm font-medium">
                    {lane.title} <span className="text-muted-foreground">({lane.issues.length})</span>
                  </p>
                )}
                <div className="grid grid-cols-5 gap-3">
                  {ISSUE_STATUSES.map((status) => {
                    const dropId = `${lane.id}:${status}`;
                    return (
                      <section
                        key={status}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOver(dropId);
                        }}
                        onDragLeave={() => setDragOver((s) => (s === dropId ? null : s))}
                        onDrop={(e) => onDrop(status, e)}
                        className={cn(
                          "space-y-2 rounded-xl bg-surface-muted/70 p-2 transition",
                          lane.title === null ? "min-h-[24rem]" : "min-h-[8rem]",
                          dragOver === dropId && "bg-primary-soft ring-2 ring-primary",
                        )}
                      >
                        {lane.issues
                          .filter((i) => i.status === status)
                          .map((i) => (
                            <IssueCard
                              key={i.id}
                              issue={i}
                              epic={epicsById.get(i.parentId)}
                              assignee={data.getEmployee(i.assigneeId)}
                              onOpen={() => navigate(`/browse/${i.key}`)}
                            />
                          ))}
                      </section>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateIssueModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projects={projects}
        defaults={{ projectKey: current.key, sprintId: sprint?.id, stayOnPage: true }}
        onCreated={() => load()}
      />
      {sprint && (
        <CompleteSprintModal
          open={completeOpen}
          onClose={() => setCompleteOpen(false)}
          sprint={sprint}
          issues={issues ?? []}
          futureSprints={futureSprints}
          onCompleted={() => load()}
        />
      )}
    </div>
  );
}

function QuickFilter({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-lg border px-3 text-sm transition",
        active ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function IssueCard({ issue, epic, assignee, onOpen }) {
  const overdue = issue.dueDate && issue.status !== "Done" && issue.dueDate < todayISO();
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", issue.id)}
      onClick={onOpen}
      className="w-full cursor-grab rounded-lg border border-border bg-surface p-3 text-left shadow-sm transition hover:border-primary/40 active:cursor-grabbing"
    >
      <p className={cn("text-sm", issue.status === "Done" && "text-muted-foreground line-through")}>{issue.title}</p>
      {(epic || issue.labels.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {epic && (
            <Badge color="#7c3aed" className="px-1.5 py-0 text-[11px]">
              {epic.title}
            </Badge>
          )}
          {issue.labels.slice(0, 2).map((l) => (
            <span key={l} className="rounded bg-surface-muted px-1.5 text-[11px] text-muted-foreground">
              {l}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <TypeIcon type={issue.type} />
        <span className="font-mono">{issue.key}</span>
        {issue.dueDate && <span className={overdue ? "text-danger" : ""}>· {formatMonthDay(issue.dueDate)}</span>}
        <span className="ml-auto flex items-center gap-1.5">
          {issue.storyPoints != null && (
            <span className="rounded-full bg-surface-muted px-1.5 text-[11px] tabular-nums">{issue.storyPoints}</span>
          )}
          <PriorityIcon priority={issue.priority} />
          {assignee && <Avatar employee={assignee} size="sm" />}
        </span>
      </div>
    </button>
  );
}
