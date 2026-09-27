import { useRef, useState } from "react";
import { FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { uploadFile, formatBytes } from "../../lib/upload";
import { Button } from "../Button";
import { cn } from "../../lib/cn";

/** Cloudinary serves resized images from the same URL with a transformation segment. */
function thumbnail(url) {
  return url.replace("/upload/", "/upload/c_fill,w_320,h_200,q_auto,f_auto/");
}

/** A grid of attachments: image previews, other files as named tiles. */
export function AttachmentGrid({ attachments, onRemove, compact = false }) {
  if (!attachments?.length) return null;
  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}>
      {attachments.map((a) => (
        <div key={a.id ?? a.publicId} className="group relative overflow-hidden rounded-lg border border-border bg-surface">
          <a href={a.url} target="_blank" rel="noreferrer" className="block">
            {a.resourceType === "image" ? (
              <img src={thumbnail(a.url)} alt={a.name} loading="lazy" className="h-24 w-full object-cover" />
            ) : (
              <span className="grid h-24 place-items-center bg-surface-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </span>
            )}
            <span className="block truncate px-2 py-1.5 text-xs">
              {a.name}
              {a.bytes > 0 && <span className="text-muted-foreground"> · {formatBytes(a.bytes)}</span>}
            </span>
          </a>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(a)}
              className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-md bg-black/60 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
              aria-label={`Remove ${a.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Pick or drop files; each is uploaded to Cloudinary and handed to
 * `onUploaded` as an attachment reference once done.
 */
export function AttachmentUploader({ onUploaded, label = "Attach files", variant = "outline", dropzone = false }) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null); // 0..1 across the batch
  const [error, setError] = useState(null);
  const [over, setOver] = useState(false);

  async function handleFiles(fileList) {
    const files = [...fileList];
    if (!files.length) return;
    setError(null);
    setProgress(0);
    const uploaded = [];
    try {
      for (const [i, file] of files.entries()) {
        uploaded.push(await uploadFile(file, (p) => setProgress((i + p) / files.length)));
      }
      await onUploaded(uploaded);
    } catch (err) {
      setError(err.message);
      if (uploaded.length) await onUploaded(uploaded);
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const busy = progress != null;
  const input = (
    <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
  );

  if (dropzone) {
    return (
      <div>
        {input}
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex w-full flex-col items-center gap-1 rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground transition hover:border-primary",
            over && "border-primary bg-primary-soft",
          )}
        >
          <Upload className="h-5 w-5" />
          {busy ? `Uploading… ${Math.round(progress * 100)}%` : "Drop files here or click to browse"}
        </button>
        {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <span className="inline-flex flex-col">
      {input}
      <Button type="button" size="sm" variant={variant} disabled={busy} onClick={() => inputRef.current?.click()}>
        <Paperclip className="h-3.5 w-3.5" />
        {busy ? `Uploading ${Math.round(progress * 100)}%` : label}
      </Button>
      {error && <span className="mt-1 text-xs text-danger">{error}</span>}
    </span>
  );
}
