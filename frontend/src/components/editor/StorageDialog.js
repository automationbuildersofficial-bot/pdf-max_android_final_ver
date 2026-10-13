import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HardDrive } from "lucide-react";

export default function StorageDialog({ open, onOpenChange, mode, onChoose, onClear, busy }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent data-testid="storage-permission-dialog" className="sm:max-w-md">
      <DialogHeader>
        <HardDrive className="h-7 w-7 text-primary mb-2" />
        <DialogTitle>Keep your work on this device?</DialogTitle>
        <DialogDescription data-testid="storage-permission-description">
          Allow this browser to store PDFs, images and edits locally. Nothing is uploaded or synced.
          Your browser decides whether to grant protected storage; clearing site data still removes local copies.
          Download a PDF to keep a separate file in your device’s storage.
        </DialogDescription>
      </DialogHeader>
      <p className="text-sm text-muted-foreground" data-testid="storage-mode-detail">
        {mode === "local" ? "Local autosave is enabled." : "Session-only work is lost when this tab is closed or reloaded unless downloaded."}
      </p>
      <DialogFooter className="gap-2">
        <Button data-testid="storage-session-button" variant="outline" disabled={busy} onClick={() => onChoose("session")}>Session only</Button>
        <Button data-testid="storage-allow-button" disabled={busy} onClick={() => onChoose("local")}>Allow local storage</Button>
      </DialogFooter>
      {mode === "local" && <Button data-testid="storage-clear-button" variant="ghost" className="text-destructive" disabled={busy} onClick={onClear}>Delete all saved local copies…</Button>}
    </DialogContent>
  </Dialog>;
}