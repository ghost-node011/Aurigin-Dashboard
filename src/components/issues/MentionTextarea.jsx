import { useLayoutEffect, useRef, useState } from "react";
import { useHRData } from "../../context/HRDataContext";
import { Avatar } from "../Avatar";
import { Textarea } from "../Input";

/**
 * A textarea where typing "@" suggests people; picking one inserts
 * `@[Name](id)`, which RichText renders as a mention and the API uses to
 * add them as a watcher.
 */
export function MentionTextarea({ value, onChange, ...props }) {
  const { employees } = useHRData();
  const ref = useRef(null);
  const [query, setQuery] = useState(null); // { text, start }
  const [highlight, setHighlight] = useState(0);
  // Where the caret goes once an inserted mention has rendered. Applied in a
  // layout effect so it lands before the next keystroke, not a frame later.
  const pendingCaret = useRef(null);
  useLayoutEffect(() => {
    if (pendingCaret.current == null || !ref.current) return;
    ref.current.focus();
    ref.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  }, [value]);

  const matches =
    query == null
      ? []
      : employees.filter((e) => e.name.toLowerCase().includes(query.text.toLowerCase())).slice(0, 6);

  function detect(text, caret) {
    const before = text.slice(0, caret);
    const m = /(^|\s)@([\w.-]{0,30})$/.exec(before);
    setQuery(m ? { text: m[2], start: caret - m[2].length - 1 } : null);
    setHighlight(0);
  }

  function pick(employee) {
    const el = ref.current;
    const caret = el.selectionStart;
    const token = `@[${employee.name}](${employee.id}) `;
    pendingCaret.current = query.start + token.length;
    onChange(value.slice(0, query.start) + token + value.slice(caret));
    setQuery(null);
  }

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          detect(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={(e) => {
          if (!matches.length) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => (h + (e.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length);
          } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            pick(matches[highlight]);
          } else if (e.key === "Escape") {
            setQuery(null);
          }
        }}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        {...props}
      />
      {matches.length > 0 && (
        <ul className="absolute left-2 z-20 mt-1 w-64 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {matches.map((e, i) => (
            <li key={e.id}>
              <button
                type="button"
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  pick(e);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${i === highlight ? "bg-surface-muted" : ""}`}
              >
                <Avatar employee={e} size="sm" /> {e.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
