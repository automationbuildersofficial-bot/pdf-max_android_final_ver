import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { FileText, FolderOpen, Download, Undo2, Redo2, Sun, Moon, MoreVertical, PanelLeft, Plus, ImagePlus, HardDrive, FilePlus2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

const STATUS = { saved: "Saved locally", saving: "Saving locally…", error: "Local save failed · download a copy", session: "Session only", idle: "On this device" };
export default function TopBar({ theme, toggleTheme, hasDoc, saveStatus, onOpenFile, onDownload, undo, redo, canUndo, canRedo, onToggleSidebar, onAddPage, onImage, onStorage, busy, onBlank, scale, onZoomIn, onZoomOut, onFitWidth, fitActive }) {
  const input = useRef(null);
  const icon = (id, label, Icon, action, disabled = false) => <Button key={id} data-testid={id} aria-label={label} title={label} size="icon" variant="ghost" className="h-11 w-11 shrink-0" onClick={action} disabled={disabled}><Icon className="h-5 w-5" /></Button>;
  return <header data-testid="top-bar" className="bg-card border-b border-border shrink-0 z-30">
    <div className="h-14 px-2 sm:px-4 flex items-center gap-1 min-w-0">
      <FileText className="text-primary h-6 w-6 ml-1 mr-2 shrink-0" />
      <div className="min-w-0 flex-1">
        <p data-testid="app-title" className="font-semibold text-sm truncate">PDF Studio</p>
        <p data-testid="autosave-indicator" role="status" className={`text-[11px] truncate ${saveStatus === "error" ? "text-destructive" : "text-muted-foreground"}`}>{STATUS[saveStatus] || STATUS.idle}</p>
      </div>
      {icon("open-file-btn", "Open PDF", FolderOpen, () => input.current.click(), busy)}
      {hasDoc && icon("save-device-btn", "Save PDF to device", Download, onDownload, busy)}
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button data-testid="more-actions-btn" aria-label="More actions" variant="ghost" size="icon" className="h-11 w-11"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent data-testid="more-actions-menu" align="end">
          <DropdownMenuItem data-testid="new-blank-menu" onClick={onBlank} disabled={busy}><FilePlus2 className="h-4 w-4 mr-2" />New blank document</DropdownMenuItem>
          <DropdownMenuItem data-testid="storage-settings-btn" onClick={onStorage}><HardDrive className="h-4 w-4 mr-2" />Device storage & permission</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem data-testid="theme-toggle-btn" onClick={toggleTheme}>{theme === "dark" ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}{theme === "dark" ? "Light mode" : "Night mode"}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    {hasDoc && <div data-testid="edit-actions" className="h-12 px-2 flex items-center gap-1 border-t border-border">
      {icon("toggle-sidebar-btn", "Pages", PanelLeft, onToggleSidebar)}
      {icon("undo-btn", "Undo", Undo2, undo, !canUndo || busy)}
      {icon("redo-btn", "Redo", Redo2, redo, !canRedo || busy)}
      <div className="flex-1" />
      {icon("zoom-out-btn", "Zoom out", ZoomOut, onZoomOut, busy)}
      <span data-testid="zoom-level" className={`text-xs tabular-nums w-10 text-center select-none ${fitActive ? "text-primary font-semibold" : "text-muted-foreground"}`}>{fitActive ? "Fit" : `${Math.round((scale || 1.4) * 100)}%`}</span>
      {icon("zoom-in-btn", "Zoom in", ZoomIn, onZoomIn, busy)}
      {icon("fit-width-btn", "Fit to screen width", Maximize2, onFitWidth, busy)}
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button data-testid="add-page-btn" aria-label="Add page" title="Add page" variant="ghost" size="icon" className="h-11 w-11" disabled={busy}><Plus className="h-5 w-5" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent data-testid="add-page-menu" align="end">
          {["blank", "ruled", "grid", "dotted"].map(style => <DropdownMenuItem data-testid={`add-${style}-page`} key={style} onClick={() => onAddPage(style)}>{style === "ruled" ? "Lined" : style[0].toUpperCase() + style.slice(1)} page</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
      {icon("insert-image-btn", "Insert image page", ImagePlus, onImage, busy)}
    </div>}
    <input ref={input} data-testid="open-file-input" type="file" accept="application/pdf,.pdf" className="hidden" onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) onOpenFile(file); }} />
  </header>;
}