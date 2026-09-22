import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Renders a PDF page by page into a scrollable column and reports when the
 * reader has reached the last page.
 *
 * Rendered with PDF.js rather than an <iframe> because the browser's own
 * PDF viewer is a plugin, not a document: it exposes no scroll position,
 * so there is no way to tell from outside it whether anyone reached the
 * end. Acknowledgement has to be gated on that, so the viewer has to be
 * ours.
 *
 * Pages render lazily as they scroll into view — rendering all 52 up front
 * would block the main thread for seconds.
 */
export function HandbookViewer({ file, jumpToPage, onReachedEnd, className }) {
  const containerRef = useRef(null);
  const pageRefs = useRef([]);
  const docRef = useRef(null);
  const renderedRef = useRef(new Set());
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState(null);

  // Load the document once.
  useEffect(() => {
    let cancelled = false;
    const task = pdfjs.getDocument({ url: file });
    task.promise.then(
      (doc) => {
        if (cancelled) return;
        docRef.current = doc;
        setNumPages(doc.numPages);
      },
      (err) => !cancelled && setError(err?.message || "Could not load the handbook."),
    );
    return () => {
      cancelled = true;
      task.destroy?.();
    };
  }, [file]);

  // Render pages as they come into view, and fire onReachedEnd when the
  // final page is visible.
  useEffect(() => {
    if (!numPages || !containerRef.current) return;

    async function renderPage(index) {
      if (renderedRef.current.has(index) || !docRef.current) return;
      renderedRef.current.add(index);
      const canvas = pageRefs.current[index];
      if (!canvas) return;

      const page = await docRef.current.getPage(index + 1);
      // Fit the page to the container's width, allowing for the device's
      // pixel ratio so text stays sharp on retina screens.
      const containerWidth = containerRef.current?.clientWidth ?? 600;
      const base = page.getViewport({ scale: 1 });
      const scale = (containerWidth - 24) / base.width;
      const viewport = page.getViewport({ scale });
      const ratio = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext("2d");
      ctx.scale(ratio, ratio);
      await page.render({ canvasContext: ctx, viewport }).promise;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number(entry.target.dataset.index);
          if (!entry.isIntersecting) continue;
          renderPage(index);
          renderPage(index + 1); // stay one page ahead of the scroll
          if (index === numPages - 1) onReachedEnd?.();
        }
      },
      { root: containerRef.current, rootMargin: "200px 0px" },
    );

    for (const canvas of pageRefs.current) if (canvas) observer.observe(canvas);
    return () => observer.disconnect();
  }, [numPages, onReachedEnd]);

  // Jump to a section.
  useEffect(() => {
    if (!jumpToPage || !numPages) return;
    const target = pageRefs.current[Math.min(jumpToPage, numPages) - 1];
    target?.scrollIntoView({ block: "start" });
  }, [jumpToPage, numPages]);

  if (error) {
    return (
      <div className={className}>
        <p className="p-4 text-sm text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      {numPages === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">Loading the handbook…</p>
      ) : (
        <div className="flex flex-col items-center gap-3 p-3">
          {Array.from({ length: numPages }, (_, i) => (
            <canvas
              key={i}
              data-index={i}
              ref={(el) => (pageRefs.current[i] = el)}
              className="max-w-full rounded border border-border bg-white shadow-sm"
            />
          ))}
        </div>
      )}
    </div>
  );
}
