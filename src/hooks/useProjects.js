import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

const STORAGE_KEY = "aurigin.project";

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * The project list plus the one currently picked on the board, backlog and
 * issue search. The pick is remembered per browser so each page opens on
 * the project you were last looking at.
 */
export function useProjects() {
  const [projects, setProjects] = useState(null);
  const [projectKey, setKey] = useState(readStored);
  const [error, setError] = useState(null);

  const reload = useCallback(() => api.getProjects().then(setProjects, (err) => setError(err.message)), []);
  useEffect(() => {
    reload();
  }, [reload]);

  const active = projects?.filter((p) => !p.archived) ?? [];
  const current = active.find((p) => p.key === projectKey) ?? active[0] ?? null;

  function setProjectKey(key) {
    setKey(key);
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      // Private mode or blocked storage — the pick just won't be remembered.
    }
  }

  return { projects: active, allProjects: projects, current, setProjectKey, reload, error };
}
