import { Link } from "react-router-dom";
import { Select } from "../Input";

/** The project switcher shown on the board, backlog and issue search. */
export function ProjectPicker({ projects, current, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Select value={current?.key ?? ""} onChange={(e) => onChange(e.target.value)} className="h-9 w-56" aria-label="Project">
        {projects.map((p) => (
          <option key={p.key} value={p.key}>
            {p.name} ({p.key})
          </option>
        ))}
      </Select>
      <Link to="/projects" className="whitespace-nowrap text-xs text-primary hover:underline">
        Manage projects
      </Link>
    </div>
  );
}
