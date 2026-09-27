import { Fragment } from "react";
import { Link } from "react-router-dom";

// @[Name](id) mentions, bare URLs and issue keys (WEB-12), in one pass.
const TOKEN = /(@\[[^\]]+\]\([a-z0-9-]+\))|(https?:\/\/[^\s)]+)|\b([A-Z][A-Z0-9]{1,9}-\d+)\b/g;

/** Plain text with line breaks kept, mentions as chips, and URLs and issue keys as links. */
export function RichText({ text, className }) {
  if (!text) return null;
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const [whole, mention, url, key] = match;
    if (mention) {
      const [, name, id] = /@\[([^\]]+)\]\(([a-z0-9-]+)\)/.exec(mention);
      parts.push(
        <Link key={match.index} to={`/directory/${id}`} className="rounded bg-primary-soft px-1 font-medium text-primary">
          @{name}
        </Link>,
      );
    } else if (url) {
      parts.push(
        <a key={match.index} href={url} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
          {url}
        </a>,
      );
    } else {
      parts.push(
        <Link key={match.index} to={`/browse/${key}`} className="font-medium text-primary hover:underline">
          {key}
        </Link>,
      );
    }
    last = match.index + whole.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return (
    <div className={className} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
      {parts.map((p, i) => (
        <Fragment key={i}>{p}</Fragment>
      ))}
    </div>
  );
}
