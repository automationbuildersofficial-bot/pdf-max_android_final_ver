import React from "react";
import { Hand, Pen, Highlighter, Eraser, SlidersHorizontal, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const tools = [["select", "Scroll & zoom", Hand], ["pen", "Pen", Pen], ["highlighter", "Highlighter", Highlighter], ["eraser", "Erase annotation", Eraser]];
const colors = ["#EF4444", "#2563EB", "#16A34A", "#EAB308", "#111827", "#FFFFFF"];
export default function Toolbar({ tool, setTool, color, setColor, size, setSize, opacity, setOpacity, straight, setStraight }) {
  return <div data-testid="annotation-toolbar" className="shrink-0 border-t border-border bg-card flex justify-center gap-1 px-2 py-1.5" style={{ paddingBottom: "max(6px, env(safe-area-inset-bottom))" }}>
    {tools.map(([id, label, Icon]) => <button key={id} data-testid={`tool-${id}-btn`} aria-label={label} aria-pressed={tool === id} title={label}
      onClick={() => { setTool(id); if (id === "highlighter") { setSize(18); setOpacity(0.35); } else if (id === "pen") { setSize(4); setOpacity(1); } }}
      className={`h-11 w-11 rounded-lg flex items-center justify-center transition-colors ${tool === id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}><Icon className="h-5 w-5" /></button>)}
    <Popover><PopoverTrigger asChild><button data-testid="color-picker-btn" aria-label="Ink colour" title="Ink colour" className="h-11 w-11 flex items-center justify-center"><span className="h-6 w-6 rounded-full border-2 border-muted-foreground" style={{ backgroundColor: color }} /></button></PopoverTrigger>
      <PopoverContent data-testid="color-popover" side="top" className="w-64"><div className="grid grid-cols-6 gap-1">{colors.map(c => <button key={c} data-testid={`color-${c.slice(1)}`} aria-label={`Colour ${c}`} title={c} onClick={() => setColor(c)} className="h-9 w-9 rounded-full border flex items-center justify-center" style={{ backgroundColor: c }}>{c === color && <Check className={`h-4 w-4 ${c === "#111827" ? "text-white" : "text-black"}`} />}</button>)}</div></PopoverContent>
    </Popover>
    <Popover><PopoverTrigger asChild><button data-testid="ink-settings-btn" aria-label="Ink settings" title="Ink settings" className="h-11 w-11 hover:bg-muted rounded-lg flex items-center justify-center"><SlidersHorizontal className="h-5 w-5" /></button></PopoverTrigger>
      <PopoverContent data-testid="ink-settings-popover" side="top" className="w-64 space-y-5">
        <label className="block text-sm">Width <span data-testid="ink-size">{size}</span><Slider data-testid="size-slider" aria-label="Ink width" className="mt-3" value={[size]} min={1} max={32} onValueChange={v => setSize(v[0])} /></label>
        <label className="block text-sm">Opacity <span data-testid="ink-opacity">{Math.round(opacity * 100)}%</span><Slider data-testid="opacity-slider" aria-label="Ink opacity" className="mt-3" value={[opacity * 100]} min={10} max={100} onValueChange={v => setOpacity(v[0] / 100)} /></label>
        <label className="flex items-center justify-between text-sm">Straight line<Switch data-testid="straight-toggle" aria-label="Straight line" checked={straight} onCheckedChange={setStraight} /></label>
      </PopoverContent>
    </Popover>
  </div>;
}