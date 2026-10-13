import React, { useEffect, useRef } from "react";
import { X, FileText, Plus } from "lucide-react";

export default function Tabs({ docs, activeDocId, onActivate, onClose, onNew, statuses }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeDocId]);
  if (!docs.length) return null;
  return <div className="flex shrink-0 border-b border-border bg-card" data-testid="doc-tabs">
    <div ref={ref} role="tablist" aria-label="Open PDFs" className="flex flex-1 min-w-0 overflow-x-auto">
      {docs.map(d => <div key={d.id} className={`flex shrink-0 border-r border-border ${d.id === activeDocId ? "bg-primary/10 border-b-2 border-b-primary" : "hover:bg-muted"}`}>
        <button role="tab" aria-selected={d.id === activeDocId} aria-controls="document-panel" data-testid={`tab-${d.id}`}
          onClick={() => onActivate(d.id)} className="h-12 flex items-center gap-2 pl-3 pr-1 max-w-[180px] min-w-[90px] text-sm">
          <FileText className="h-4 w-4 shrink-0" /><span className="truncate">{d.name}</span>
          {statuses[d.id] !== "saved" && <span data-testid={`tab-unsaved-${d.id}`} aria-label="Not saved locally" className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />}
        </button>
        <button data-testid={`tab-close-${d.id}`} aria-label={`Close ${d.name}`} title={`Close ${d.name}`} onClick={() => onClose(d.id)} className="w-11 h-12 flex items-center justify-center hover:bg-muted"><X className="h-4 w-4" /></button>
      </div>)}
    </div>
    <button data-testid="tab-new-btn" aria-label="Open another document" title="Open another document" onClick={onNew} className="w-12 shrink-0 hover:bg-muted flex items-center justify-center"><Plus className="h-5 w-5" /></button>
  </div>;
}