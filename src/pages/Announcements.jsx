import { useState } from "react";
import { Pin, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useHRData } from "../context/HRDataContext";
import { ANNOUNCEMENT_CATEGORIES } from "../data/announcements";
import { formatDate } from "../lib/date";
import { Avatar } from "../components/Avatar";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { Field, Input, Select, Textarea } from "../components/Input";

export default function Announcements() {
  const { currentUser } = useAuth();
  const data = useHRData();
  const [createOpen, setCreateOpen] = useState(false);
  const canCreate = ["hr", "admin"].includes(currentUser.role);

  const sorted = [...data.announcements].sort((a, b) => (b.pinned - a.pinned) || b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">What's happening at Aurigin Media.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New announcement
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {sorted.map((a) => {
          const author = data.getEmployee(a.authorId);
          const category = ANNOUNCEMENT_CATEGORIES.find((c) => c.id === a.category);
          return (
            <div key={a.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {a.pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                  <h3 className="font-display text-lg font-semibold">{a.title}</h3>
                </div>
                <Badge color={category.color}>{category.label}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{a.body}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar employee={author} size="sm" />
                {author.name} · {formatDate(a.date)}
              </div>
            </div>
          );
        })}
      </div>

      <NewAnnouncementModal open={createOpen} onClose={() => setCreateOpen(false)} currentUser={currentUser} onSubmit={data.addAnnouncement} />
    </div>
  );
}

function NewAnnouncementModal({ open, onClose, currentUser, onSubmit }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(ANNOUNCEMENT_CATEGORIES[0].id);
  const [pinned, setPinned] = useState(false);

  const canSubmit = title.trim().length > 0 && body.trim().length > 0;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ title: title.trim(), body: body.trim(), category, authorId: currentUser.id, pinned });
    setTitle("");
    setBody("");
    setPinned(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New announcement">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Office closed on…" />
        </Field>
        <Field label="Category" required>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {ANNOUNCEMENT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Body" required>
          <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details everyone needs to know…" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="rounded border-border" />
          Pin to top
        </label>
        <Button type="submit" disabled={!canSubmit} className="w-full">
          Publish
        </Button>
      </form>
    </Modal>
  );
}
