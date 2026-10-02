import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Select } from "../Input";

/** The project switcher shown on the board, backlog and issue search. */
export const ALL_PROJECTS = "ALL";

/** The project switcher shown on the board, backlog and issue search. `allowAll` adds "All projects". */
export function ProjectPicker({ projects, current, onChange, allowAll = false }) {
  const { currentUser } = useAuth();
  const canManage = currentUser?.role === "admin" || Boolean(currentUser?.canManageProjects);
  return (
    <div className="flex items-center gap-2">
      <Select value={current?.key ?? ALL_PROJECTS} onChange={(e) => onChange(e.target.value)} className="h-9 w-56" aria-label="Project">
        {allowAll && <option value={ALL_PROJECTS}>All projects</option>}
        {projects.map((p) => (
          <option key={p.key} value={p.key}>
            {p.name} ({p.key})
          </option>
        ))}
      </Select>
      {canManage && (
        <Link to="/projects" className="whitespace-nowrap text-xs text-primary hover:underline">
          Manage projects
        </Link>
      )}
    </div>
  );
}
