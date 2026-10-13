import React, { useEffect, useRef, useState } from "react";
import { X, FileText, Plus } from "lucide-react";

export default function Tabs({ docs, activeDocId, onActivate, onClose, onNew, onReorder, statuses }) {
  const ref = useRef(null);
  const [dragId, setDragId] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const drag = useRef({ id: null, index: null, startX: 0, started: false, suppressClick: false });

  useEffect(() => {
    ref.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeDocId]);

  const indexFromPoint = (x, y) => {
    const el = document.elementFromPoint(x, y)?.closest?.("[data-tab-index]");
    return el ? Number(el.getAttribute("data-tab-index")) : null;
  };

  const onPointerDown = (e, i, id) => {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest?.('[data-testid^="tab-close-"]')) return; // let close button work
    drag.current = { id, index: i, startX: e.clientX, started: false, suppressClick: false };
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch (err) { /* some browsers throw when the pointer isn't yet active (e.g. synthesized events); drag still works via refs */ }
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (d.id == null) return;
    if (!d.started) {
      if (Math.abs(e.clientX - d.startX) < 6) return;
      d.started = true;
      setDragId(d.id);
    }
    e.preventDefault();
    const idx = indexFromPoint(e.clientX, e.clientY);
    if (idx != null) setOverIndex(idx);
  };
  const onPointerUp = () => {
    const d = drag.current;
    if (d.started && overIndex != null && d.index != null && overIndex !== d.index) {
      onReorder?.(d.index, overIndex);
      d.suppressClick = true;
      setTimeout(() => { drag.current.suppressClick = false; }, 60);
    }
    drag.current = { ...drag.current, id: null, index: null, started: false };
    setDragId(null);
    setOverIndex(null);
  };

  if (!docs.length) return null;
  return <div className="flex shrink-0 border-b border-border bg-card" data-testid="doc-tabs">
    <div ref={ref} role="tablist" aria-label="Open PDFs" className="flex flex-1 min-w-0 overflow-x-auto">
      {docs.map((d, i) => {
        const isOver = overIndex === i && dragId != null && d.id !== dragId;
        return <div key={d.id} data-tab-index={i} data-testid={`tab-wrap-${d.id}`}
          onPointerDown={e => onPointerDown(e, i, d.id)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ touchAction: "none" }}
          className={`flex shrink-0 border-r border-border select-none ${d.id === activeDocId ? "bg-primary/10 border-b-2 border-b-primary" : "hover:bg-muted"} ${isOver ? "border-l-2 border-l-primary" : ""} ${d.id === dragId ? "opacity-50" : ""}`}>
          <button role="tab" aria-selected={d.id === activeDocId} aria-controls="document-panel" data-testid={`tab-${d.id}`}
            onClick={() => { if (drag.current.suppressClick) return; onActivate(d.id); }}
            className="h-12 flex items-center gap-2 pl-3 pr-1 max-w-[180px] min-w-[90px] text-sm cursor-pointer">
            <FileText className="h-4 w-4 shrink-0" /><span className="truncate">{d.name}</span>
            {statuses[d.id] !== "saved" && <span data-testid={`tab-unsaved-${d.id}`} aria-label="Not saved locally" className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />}
          </button>
          <button data-testid={`tab-close-${d.id}`} aria-label={`Close ${d.name}`} title={`Close ${d.name}`} onClick={() => onClose(d.id)} className="w-11 h-12 flex items-center justify-center hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>;
      })}
    </div>
    <button data-testid="tab-new-btn" aria-label="Open another PDF" title="Open another PDF" onClick={onNew} className="w-12 shrink-0 hover:bg-muted flex items-center justify-center"><Plus className="h-5 w-5" /></button>
  </div>;
}
