import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, Search } from "lucide-react";
import { useHRData } from "../context/HRDataContext";
import { api } from "../lib/api";
import { formatMonthDay } from "../lib/date";
import { useProjects } from "../hooks/useProjects";
import { Badge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { TypeIcon, PriorityIcon } from "../components/issues/IssueIcons";
import { ProjectPicker } from "../components/issues/ProjectPicker";
import { CreateIssueModal } from "../components/issues/CreateIssueModal";
import { SprintFormModal, CompleteSprintModal } from "../components/issues/SprintModals";
import { cn } from "../lib/cn";

import { ACTIVE, BACKLOG, planningValue } from "../data/work";

/**
 * Planning: open sprints on top, then active tasks (work in hand that isn't
 * in a sprint) and the backlog (work parked for later — unfinished days,
 * later work and unfixed bugs from My Day, or moved there by hand). Drag
 * issues to reorder them or move them between sections.
 */
export default function Backlog() {
  const data = useHRData();
  const { projects, current, setProjectKey, error: projectError } = useProjects();
  const [sprints, setSprints] = useState(null);
  const [reportSprintId, setReportSprintId] = useState(null);
  const [issues, setIssues] = useState(null);
  const [epics, setEpics] = useState([]);
  const [epicFilter, setEpicFilter] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [dragging, setDragging] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { section, beforeId }
  const [createOpen, setCreateOpen] = useState(false);
  const [sprintModal, setSprintModal] = useState(null); // { sprint, mode }
  const [completing, setCompleting] = useState(null);

  const load = useCallback(async () => {
    if (!current) return;
    setError(null);
    try {
      const [allSprints, all] = await Promise.all([
        api.getSprints(current.key),
        api.searchIssues({ project: current.key, sort: "rank" }),
      ]);
      setSprints(allSprints.filter((s) => s.state !== "closed"));
      // The active sprint's report, else the most recently completed one.
      setReportSprintId((allSprints.find((s) => s.state === "active") ?? allSprints.find((s) => s.state === "closed"))?.id ?? null);
      setEpics(all.filter((i) => i.type === "Epic"));
      // Jira's backlog lists top-level work; sub-tasks live on their parent.
      setIssues(all.filter((i) => i.type !== "Epic" && i.type !== "Sub-task"));
    } catch (err) {
      setError(err.message);
    }
  }, [current]);

  useEffect(() => {
    setIssues(null);
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (issues ?? []).filter(
      (i) =>
        (!epicFilter || i.parentId === epicFilter) &&
        (!q || i.title.toLowerCase().includes(q) || i.key.toLowerCase().includes(q)),
    );
  }, [issues, epicFilter, query]);

  const sections = useMemo(() => {
    const bySprint = (id) => filtered.filter((i) => planningValue(i) === id);
    return [
      ...(sprints ?? []).map((s) => ({ id: s.id, sprint: s, issues: bySprint(s.id) })),
      { id: ACTIVE, sprint: null, issues: bySprint(ACTIVE) },
      { id: BACKLOG, sprint: null, issues: bySprint(BACKLOG) },
    ];
  }, [filtered, sprints]);

  const hasActive = sprints?.some((s) => s.state === "active");

  async function drop(sectionId, beforeId) {
    const issue = issues.find((i) => i.id === dragging);
    setDragging(null);
    setDropTarget(null);
    if (!issue || issue.id === beforeId) return;
    // The section's full order (ignoring search/epic filters), with the
    // dragged issue slotted in before `beforeId` or at the end.
    const order = issues.filter((i) => planningValue(i) === sectionId && i.id !== issue.id).map((i) => i.id);
    const at = beforeId ? order.indexOf(beforeId) : -1;
    order.splice(at === -1 ? order.length : at, 0, issue.id);

    const isSprint = sectionId !== BACKLOG && sectionId !== ACTIVE;
    const sprintId = isSprint ? sectionId : null;
    const inBacklog = sectionId === BACKLOG;
    const previous = issues;
    setIssues((list) => {
      const moved = list.map((i) => (i.id === issue.id ? { ...i, sprintId, inBacklog } : i));
      const rank = new Map(order.map((id, n) => [id, n]));
      return [...moved].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
    });
    try {
      await api.rankIssues(order, sprintId, inBacklog);
    } catch (err) {
      setIssues(previous);
      setError(err.message);
    }
  }

  if (projectError) return <p className="text-sm text-danger">{projectError}</p>;
  if (!current) return <p className="text-sm text-muted-foreground">Loading projects…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{current.name}</p>
          <h1 className="font-display text-3xl font-semibold">Backlog</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {reportSprintId && (
            <Link to={`/sprints/${reportSprintId}/report`} className="mr-1 text-sm text-primary hover:underline">
              Sprint reports
            </Link>
          )}
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await api.addSprint(current.key);
                load();
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            Create sprint
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Create issue
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ProjectPicker projects={projects} current={current} onChange={setProjectKey} />
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search backlog" className="h-9 py-1.5 pl-9" />
        </div>
      </div>

      {epics.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-muted-foreground">Epics:</span>
          {epics.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setEpicFilter((f) => (f === e.id ? null : e.id))}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition",
                epicFilter === e.id ? "border-[#7c3aed] bg-[#7c3aed] text-white" : "border-border hover:border-[#7c3aed]",
              )}
            >
              {e.title}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      {!issues && !error && <p className="text-sm text-muted-foreground">Loading the backlog…</p>}

      {issues &&
        sections.map((section) => {
          const s = section.sprint;
          const isCollapsed = collapsed[section.id];
          const points = section.issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
          const done = section.issues.filter((i) => i.status === "Done").length;
          return (
            <section
              key={section.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (dropTarget?.section !== section.id) setDropTarget({ section: section.id, beforeId: null });
              }}
              onDrop={(e) => {
                e.preventDefault();
                drop(section.id, dropTarget?.beforeId ?? null);
              }}
              className={cn(
                "rounded-2xl border border-border bg-surface transition",
                dragging && dropTarget?.section === section.id && "ring-2 ring-primary",
              )}
            >
              <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }))}
                  className="flex items-center gap-1.5 font-medium"
                >
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {s ? s.name : section.id === ACTIVE ? "Active tasks" : "Backlog"}
                </button>
                {s?.state === "active" && <Badge tone="info">Active</Badge>}
                <span className="text-xs text-muted-foreground">
                  {s?.startDate && `${formatMonthDay(s.startDate)} – ${formatMonthDay(s.endDate)} · `}
                  {section.issues.length} issue{section.issues.length === 1 ? "" : "s"}
                  {points > 0 && ` · ${points} pts`}
                  {s && section.issues.length > 0 && ` · ${done} done`}
                </span>
                {s?.goal && <span className="hidden truncate text-xs text-muted-foreground md:inline">— {s.goal}</span>}
                <div className="ml-auto flex items-center gap-2">
                  {s?.state === "future" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={hasActive || section.issues.length === 0}
                      title={hasActive ? "Complete the active sprint first" : section.issues.length === 0 ? "Add issues first" : ""}
                      onClick={() => setSprintModal({ sprint: s, mode: "start" })}
                    >
                      Start sprint
                    </Button>
                  )}
                  {s?.state === "active" && (
                    <Button size="sm" variant="outline" onClick={() => setCompleting(s)}>
                      Complete sprint
                    </Button>
                  )}
                  {s && (
                    <SprintMenu
                      sprint={s}
                      onEdit={() => setSprintModal({ sprint: s, mode: "edit" })}
                      onDelete={async () => {
                        if (!confirm(`Delete ${s.name}? Its issues move to the backlog.`)) return;
                        try {
                          await api.deleteSprint(s.id);
                          load();
                        } catch (err) {
                          setError(err.message);
                        }
                      }}
                    />
                  )}
                </div>
              </header>

              {!isCollapsed && (
                <div className="border-t border-border">
                  {section.issues.length === 0 && (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                      {s
                        ? "Drag issues here to plan this sprint."
                        : section.id === ACTIVE
                        ? "No active tasks outside a sprint."
                        : "Nothing parked. Unfinished work from My Day, later work and bugs land here."}
                    </p>
                  )}
                  <ul>
                    {section.issues.map((i) => (
                      <li
                        key={i.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          setDragging(i.id);
                        }}
                        onDragEnd={() => {
                          setDragging(null);
                          setDropTarget(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDropTarget({ section: section.id, beforeId: i.id });
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          drop(section.id, i.id);
                        }}
                        className={cn(
                          "flex cursor-grab items-center gap-2.5 border-b border-border px-4 py-2 text-sm last:border-b-0 hover:bg-surface-muted/60",
                          dragging === i.id && "opacity-40",
                          dropTarget?.beforeId === i.id && dragging !== i.id && "border-t-2 border-t-primary",
                        )}
                      >
                        <TypeIcon type={i.type} />
                        <Link to={`/browse/${i.key}`} className="shrink-0 font-mono text-xs text-muted-foreground hover:text-primary">
                          {i.key}
                        </Link>
                        <Link
                          to={`/browse/${i.key}`}
                          className={cn("min-w-0 flex-1 truncate hover:text-primary", i.status === "Done" && "line-through opacity-70")}
                        >
                          {i.title}
                        </Link>
                        {i.parentId && epics.find((e) => e.id === i.parentId) && (
                          <Badge color="#7c3aed" className="hidden px-1.5 py-0 text-[11px] sm:inline-flex">
                            {epics.find((e) => e.id === i.parentId).title}
                          </Badge>
                        )}
                        <Badge className="hidden sm:inline-flex">{i.status}</Badge>
                        {i.storyPoints != null && (
                          <span className="w-7 rounded-full bg-surface-muted text-center text-[11px] tabular-nums">{i.storyPoints}</span>
                        )}
                        <PriorityIcon priority={i.priority} />
                        <span className="w-7">{i.assigneeId && <Avatar employee={data.getEmployee(i.assigneeId)} size="sm" />}</span>
                      </li>
                    ))}
                  </ul>
                  <QuickCreate
                    onCreate={async (title) => {
                      await api.addIssue({
                        projectKey: current.key,
                        title,
                        type: "Task",
                        sprintId: s?.id ?? null,
                        inBacklog: section.id === BACKLOG,
                      });
                      load();
                    }}
                  />
                </div>
              )}
            </section>
          );
        })}

      <CreateIssueModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projects={projects}
        defaults={{ projectKey: current.key, stayOnPage: true }}
        onCreated={() => load()}
      />
      <SprintFormModal
        open={Boolean(sprintModal)}
        onClose={() => setSprintModal(null)}
        sprint={sprintModal?.sprint}
        mode={sprintModal?.mode}
        onSaved={() => load()}
      />
      {completing && (
        <CompleteSprintModal
          open
          onClose={() => setCompleting(null)}
          sprint={completing}
          issues={issues.filter((i) => i.sprintId === completing.id)}
          futureSprints={(sprints ?? []).filter((s) => s.state === "future")}
          onCompleted={() => load()}
        />
      )}
    </div>
  );
}

function SprintMenu({ sprint, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface-muted"
        aria-label="Sprint actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-surface py-1 text-sm shadow-lg">
          <button type="button" onMouseDown={onEdit} className="block w-full px-3 py-1.5 text-left hover:bg-surface-muted">
            Edit sprint
          </button>
          {sprint.state === "future" && (
            <button type="button" onMouseDown={onDelete} className="block w-full px-3 py-1.5 text-left text-danger hover:bg-surface-muted">
              Delete sprint
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function QuickCreate({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-1.5 px-4 py-2 text-sm text-muted-foreground hover:bg-surface-muted/60">
        <Plus className="h-3.5 w-3.5" /> Create issue
      </button>
    );
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim() || busy) return;
        setBusy(true);
        try {
          await onCreate(title.trim());
          setTitle("");
        } finally {
          setBusy(false);
        }
      }}
      className="px-4 py-2"
    >
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => !title && setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="What needs to be done? Press Enter to create a task."
        className="h-9 py-1.5"
      />
    </form>
  );
}
