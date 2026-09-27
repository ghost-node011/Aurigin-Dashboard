import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useHRData } from "../context/HRDataContext";
import { api } from "../lib/api";
import { useProjects } from "../hooks/useProjects";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { Field, Input, Select, Textarea } from "../components/Input";

/**
 * Jira-style projects. Only project managers — admins, plus anyone an admin
 * has given the permission on their profile — create them; they and each
 * project's lead can edit.
 */
export default function Projects() {
  const { currentUser } = useAuth();
  const data = useHRData();
  const { allProjects, reload, setProjectKey } = useProjects();
  const [editing, setEditing] = useState(null); // project, or {} for new
  const canCreate = currentUser.role === "admin" || Boolean(currentUser.canManageProjects);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each project has its own issue keys, backlog, sprints and board. My Day files tasks into the project they
            belong to.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setEditing({})}>
            <Plus className="h-4 w-4" /> Create project
          </Button>
        )}
      </div>

      {!allProjects && <p className="text-sm text-muted-foreground">Loading…</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allProjects?.map((p) => {
          const lead = data.getEmployee(p.leadId);
          const canEdit = canCreate || p.leadId === currentUser.id;
          return (
            <Card key={p.key} className={p.archived ? "opacity-60" : ""}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold">{p.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{p.key}</p>
                </div>
                {p.archived && <Badge>Archived</Badge>}
              </div>
              {p.description && <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>}
              <p className="mt-3 flex items-center gap-2 text-sm">
                <Avatar employee={lead} size="sm" /> {lead?.name ?? p.leadId} <span className="text-muted-foreground">· lead</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                {!p.archived && (
                  <>
                    <Link to="/board" onClick={() => setProjectKey(p.key)} className="text-primary hover:underline">
                      Board
                    </Link>
                    <Link to="/backlog" onClick={() => setProjectKey(p.key)} className="text-primary hover:underline">
                      Backlog
                    </Link>
                    <Link to={`/issues?project=${p.key}`} className="text-primary hover:underline">
                      Issues
                    </Link>
                  </>
                )}
                {canEdit && (
                  <button type="button" onClick={() => setEditing(p)} className="ml-auto text-muted-foreground hover:text-foreground">
                    Edit
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <ProjectModal
        project={editing}
        employees={data.employees}
        currentUserId={currentUser.id}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
    </div>
  );
}

function ProjectModal({ project, employees, currentUserId, onClose, onSaved }) {
  const isNew = project && !project.key;
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Seed the form each time a different project (or "new") is opened.
  const seedKey = project ? project.key ?? "new" : null;
  const [seededFor, setSeededFor] = useState(null);
  if (seedKey !== seededFor) {
    setSeededFor(seedKey);
    setError(null);
    setForm(
      project
        ? {
            key: project.key ?? "",
            name: project.name ?? "",
            description: project.description ?? "",
            leadId: project.leadId ?? currentUserId,
            archived: project.archived ?? false,
          }
        : null,
    );
  }

  if (!project || !form) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isNew) await api.addProject({ ...form, key: form.key.toUpperCase() });
      else await api.updateProject(project.key, { name: form.name, description: form.description, leadId: form.leadId, archived: form.archived });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={isNew ? "Create project" : `Edit ${project.name}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label="Name" required>
            <Input
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                // Suggest a key from the name until one is typed by hand.
                setForm((f) => ({
                  ...f,
                  name,
                  key: isNew && (!f.key || f.key === suggestKey(f.name)) ? suggestKey(name) : f.key,
                }));
              }}
            />
          </Field>
          <Field label="Key" required>
            <Input value={form.key} onChange={set("key")} disabled={!isNew} maxLength={10} className="font-mono uppercase" />
          </Field>
        </div>
        {isNew && <p className="-mt-2 text-xs text-muted-foreground">The key prefixes every issue (e.g. {form.key || "WEB"}-1) and can't be changed later.</p>}
        <Field label="Description">
          <Textarea rows={3} value={form.description} onChange={set("description")} />
        </Field>
        <Field label="Project lead">
          <Select value={form.leadId} onChange={set("leadId")}>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
        </Field>
        {!isNew && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.archived}
              onChange={(e) => setForm((f) => ({ ...f, archived: e.target.checked }))}
              className="h-4 w-4 accent-primary"
            />
            Archived (hidden from the board, backlog and new issues)
          </label>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={busy || !form.name.trim() || !form.key.trim()} className="w-full">
          {isNew ? "Create project" : "Save"}
        </Button>
      </form>
    </Modal>
  );
}

function suggestKey(name) {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  const key = words.length > 1 ? words.map((w) => w[0]).join("") : (words[0] ?? "").slice(0, 4);
  return /^[A-Z]/.test(key) ? key.slice(0, 10) : "";
}
