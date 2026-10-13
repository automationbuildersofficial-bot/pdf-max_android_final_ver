import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ConfirmDialog({ value, onClose }) {
  return <Dialog open={!!value} onOpenChange={open => !open && onClose()}>
    <DialogContent data-testid="confirm-dialog" className="sm:max-w-md">
      <DialogHeader><DialogTitle>{value?.title}</DialogTitle><DialogDescription data-testid="confirm-description">{value?.description}</DialogDescription></DialogHeader>
      <DialogFooter className="gap-2">
        <Button data-testid="confirm-cancel" variant="outline" onClick={onClose}>Cancel</Button>
        <Button data-testid="confirm-accept" variant={value?.danger ? "destructive" : "default"} onClick={() => { const action = value?.action; onClose(); action?.(); }}>{value?.label || "Confirm"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}