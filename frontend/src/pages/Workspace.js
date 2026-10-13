import React, { useReducer, useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "@/context/ThemeProvider";
import { loadPdfDocument } from "@/lib/pdfEngine";
import { buildPdf, downloadBytes } from "@/lib/exportPdf";
import {
  deleteFile,
  putState,
  getState,
  deleteState,
  getRecents,
  addRecent,
  removeRecent,
  clearFiles,
} from "@/lib/storage";
import TopBar from "@/components/editor/TopBar";
import Sidebar from "@/components/editor/Sidebar";
import Reader from "@/components/editor/Reader";
import Toolbar from "@/components/editor/Toolbar";
import Tabs from "@/components/editor/Tabs";
import StartScreen from "@/components/editor/StartScreen";
import ImageInsertDialog from "@/components/editor/ImageInsertDialog";
import StorageDialog from "@/components/editor/StorageDialog";
import ConfirmDialog from "@/components/editor/ConfirmDialog";
import { toast } from "sonner";
import { Loader2, PanelLeftOpen } from "lucide-react";

let pid = 0;
const newPageId = () => `p${Date.now()}_${pid++}`;
const newDocId = () => `doc${Date.now()}_${pid++}`;

function PageJump({ current, total, onJump }) {
  const [val, setVal] = useState(String(current));
  useEffect(() => setVal(String(current)), [current]);
  const commit = () => {
    const n = parseInt(val, 10);
    if (!isNaN(n)) onJump(n);
    else setVal(String(current));
  };
  return (
    <div
      data-testid="page-jump"
      className="absolute bottom-4 right-4 z-30 flex items-center gap-1 rounded-full bg-card/95 backdrop-blur border border-border shadow-lg px-3 py-1.5 text-sm"
    >
      <input
        data-testid="page-jump-input"
        type="number"
        min={1}
        max={total}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => { if (e.key === "Enter") { commit(); e.target.blur(); } }}
        onBlur={commit}
        aria-label="Go to page"
        className="w-9 bg-transparent text-center outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="text-muted-foreground whitespace-nowrap">/ {total}</span>
    </div>
  );
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 3;

function makeDoc({ id, name, sources, sourceBlobs, pages, recentId, activePageId, scale }) {
  return {
    id,
    name,
    sources,
    sourceBlobs: sourceBlobs || {},
    pages,
    past: [],
    future: [],
    activePageId: activePageId || pages[0]?.id || null,
    selected: new Set(),
    scale: scale || 1.4,
    recentId: recentId || id,
  };
}

function reducer(state, action) {
  const { docs } = state;
  const upd = (id, fn) => docs.map((d) => (d.id === id ? fn(d) : d));
  switch (action.type) {
    case "OPEN":
      return { docs: [...docs, action.doc], activeDocId: action.doc.id };
    case "CLOSE": {
      const rest = docs.filter((d) => d.id !== action.id);
      let act = state.activeDocId;
      if (act === action.id) act = rest.length ? rest[rest.length - 1].id : null;
      return { docs: rest, activeDocId: act };
    }
    case "ACTIVATE":
      return { ...state, activeDocId: action.id };
    case "COMMIT":
      return {
        ...state,
        docs: upd(action.id, (d) => ({
          ...d,
          pages: action.pages,
          past: [...d.past, d.pages].slice(-60),
          future: [],
        })),
      };
    case "UNDO":
      return {
        ...state,
        docs: upd(action.id, (d) => {
          if (!d.past.length) return d;
          const prev = d.past[d.past.length - 1];
          return { ...d, pages: prev, past: d.past.slice(0, -1), future: [d.pages, ...d.future] };
        }),
      };
    case "REDO":
      return {
        ...state,
        docs: upd(action.id, (d) => {
          if (!d.future.length) return d;
          const next = d.future[0];
          return { ...d, pages: next, past: [...d.past, d.pages], future: d.future.slice(1) };
        }),
      };
    case "SET_PAGE":
      return { ...state, docs: upd(action.id, (d) => ({ ...d, activePageId: action.pageId })) };
    case "SET_SELECTED":
      return { ...state, docs: upd(action.id, (d) => ({ ...d, selected: action.selected })) };
    case "SET_SCALE":
      return { ...state, docs: upd(action.id, (d) => ({ ...d, scale: action.scale })) };
    case "REFIT_ALL":
      return { ...state, docs: docs.map((d) => ({ ...d, scale: action.scale })) };
    case "MOVE_DOC": {
      const next = [...docs];
      const [moved] = next.splice(action.from, 1);
      next.splice(action.to, 0, moved);
      return { ...state, docs: next };
    }
    default:
      return state;
  }
}

export default function Workspace() {
  const { theme, toggle } = useTheme();

  const [{ docs, activeDocId }, dispatch] = useReducer(reducer, { docs: [], activeDocId: null });
  const [recents, setRecents] = useState(() => getRecents());
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [tool, setTool] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "select" : "pen"
  );
  const [color, setColor] = useState("#EF4444");
  const [size, setSize] = useState(4);
  const [opacity, setOpacity] = useState(1);
  const [straight, setStraight] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) return false;
    return localStorage.getItem("pdf_sidebar_open") !== "0";
  });

  const [imgDlg, setImgDlg] = useState({ open: false, index: 0 });
  const [confirm, setConfirm] = useState(null);
  const [fitActive, setFitActive] = useState(false);
  const openInputRef = useRef(null);
  const mainRef = useRef(null);

  // ---- on-device storage consent: "local" (persist) | "session" (memory only) ----
  const [storageMode, setStorageMode] = useState(() => localStorage.getItem("pdf_storage_mode"));
  const [storageDlg, setStorageDlg] = useState(false);
  const [statuses, setStatuses] = useState({}); // docId -> saved | saving | session | error
  const setDocStatus = (id, s) => setStatuses((prev) => ({ ...prev, [id]: s }));

  useEffect(() => {
    if (!storageMode) setStorageDlg(true);
  }, [storageMode]);

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );
  useEffect(() => {
    const fitScale = () => Math.max(MIN_SCALE, Math.min(1.6, (window.innerWidth - 40) / 595));
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 1024) dispatch({ type: "REFIT_ALL", scale: fitScale() });
    };
    const onOrient = () => setTimeout(onResize, 150);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrient);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrient);
    };
  }, []);
  const initialScale = () =>
    typeof window !== "undefined" && window.innerWidth < 768
      ? Math.max(MIN_SCALE, (window.innerWidth - 40) / 595)
      : 1.4;

  useEffect(() => localStorage.setItem("pdf_sidebar_open", sidebarOpen ? "1" : "0"), [sidebarOpen]);

  // ---- persist full edit state on-device (debounced) when local storage is allowed ----
  const saveTimers = useRef({});
  const saveDocState = useCallback(
    async (d) => {
      if (storageMode !== "local" || !d?.recentId) return;
      try {
        await putState(d.recentId, {
          name: d.name,
          activePageId: d.activePageId,
          pages: d.pages,
          sourceBlobs: d.sourceBlobs,
        });
        setRecents(addRecent({ id: d.recentId, name: d.name, pages: d.pages.length, ts: Date.now() }));
        setDocStatus(d.id, "saved");
      } catch (e) {
        setDocStatus(d.id, "error");
      }
    },
    [storageMode]
  );

  useEffect(() => {
    docs.forEach((d) => {
      if (storageMode !== "local") {
        setDocStatus(d.id, "session");
        return;
      }
      clearTimeout(saveTimers.current[d.id]);
      saveTimers.current[d.id] = setTimeout(() => saveDocState(d), 700);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, storageMode]);

  const doc = docs.find((d) => d.id === activeDocId) || null;
  const pages = doc?.pages || [];
  const sources = doc?.sources || {};
  const activeIndex = doc ? pages.findIndex((p) => p.id === doc.activePageId) : -1;

  // ---- storage consent handlers ----
  const chooseStorage = (mode) => {
    localStorage.setItem("pdf_storage_mode", mode);
    setStorageMode(mode);
    setStorageDlg(false);
    if (mode === "local") {
      docs.forEach((d) => saveDocState(d));
      toast.success("Local autosave is on — your work stays on this device");
    } else {
      toast.message("Session only — download a copy to keep your edits");
    }
  };
  const clearStorage = () => {
    setConfirm({
      title: "Delete all local copies?",
      description: "Every PDF, image and edit saved in this browser will be permanently removed. Open tabs stay until you close them.",
      label: "Delete everything",
      danger: true,
      action: async () => {
        try {
          await clearFiles();
          localStorage.removeItem("pdf_recents");
          setRecents([]);
          toast.success("All local copies deleted");
        } catch (e) {
          toast.error("Could not clear local storage");
        }
      },
    });
  };

  // ---- open / build ----
  const buildPdfPages = async (buf, srcId) => {
    const pdfDoc = await loadPdfDocument(buf);
    const list = [];
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const pg = await pdfDoc.getPage(i);
      const vp = pg.getViewport({ scale: 1, rotation: 0 });
      list.push({
        id: newPageId(),
        kind: "pdf",
        srcId,
        pdfIndex: i,
        width: vp.width,
        height: vp.height,
        rotation: 0,
        annotations: [],
      });
    }
    return { pdfDoc, list };
  };

  const openFile = async (file) => {
    try {
      setLoading(true);
      const buf = new Uint8Array(await file.arrayBuffer());
      const name = file.name.replace(/\.pdf$/i, "");
      const srcId = "src" + Date.now();
      const srcBlob = new Blob([buf.slice()], { type: "application/pdf" });
      const { pdfDoc, list } = await buildPdfPages(buf, srcId);
      const id = newDocId();
      const document = makeDoc({
        id,
        name,
        sources: { [srcId]: pdfDoc },
        sourceBlobs: { [srcId]: srcBlob },
        pages: list,
        scale: initialScale(),
      });
      dispatch({ type: "OPEN", doc: document });
      await saveDocState(document);
      toast.success(`Opened “${file.name}” · ${list.length} pages`);
    } catch (e) {
      toast.error("Could not open this PDF.");
    } finally {
      setLoading(false);
    }
  };

  const newBlankDoc = () => {
    const page = { id: newPageId(), kind: "blank", lineStyle: "blank", width: 595, height: 842, rotation: 0, annotations: [] };
    const id = newDocId();
    const document = makeDoc({ id, name: "Untitled", sources: {}, pages: [page], scale: initialScale() });
    dispatch({ type: "OPEN", doc: document });
    saveDocState(document);
    toast.success("New blank document");
  };

  const openRecent = async (r) => {
    const existing = docs.find((d) => d.recentId === r.id);
    if (existing) {
      dispatch({ type: "ACTIVATE", id: existing.id });
      return;
    }
    try {
      setLoading(true);
      const state = await getState(r.id);
      if (!state || !state.pages) {
        toast.error("This file is no longer available on the device.");
        setRecents(removeRecent(r.id));
        return;
      }
      const src = {};
      for (const [srcId, blob] of Object.entries(state.sourceBlobs || {})) {
        const buf = new Uint8Array(await blob.arrayBuffer());
        src[srcId] = await loadPdfDocument(buf);
      }
      const document = makeDoc({
        id: newDocId(),
        name: state.name || r.name,
        sources: src,
        sourceBlobs: state.sourceBlobs || {},
        pages: state.pages,
        activePageId: state.activePageId,
        recentId: r.id,
        scale: initialScale(),
      });
      dispatch({ type: "OPEN", doc: document });
      setDocStatus(document.id, "saved");
    } catch (e) {
      toast.error("Could not reopen this file.");
    } finally {
      setLoading(false);
    }
  };

  const removeRecentFile = (id) => {
    setConfirm({
      title: "Remove from device?",
      description: "This deletes the saved copy and all its edits from this browser.",
      label: "Remove",
      danger: true,
      action: async () => {
        await deleteState(id);
        await deleteFile(id);
        setRecents(removeRecent(id));
        toast.success("Removed from device");
      },
    });
  };

  // ---- per-doc operations ----
  const commit = (nextPages) => {
    setDocStatus(doc.id, storageMode === "local" ? "saving" : "session");
    dispatch({ type: "COMMIT", id: doc.id, pages: nextPages });
  };
  const setActivePage = useCallback(
    (pageId) => dispatch({ type: "SET_PAGE", id: activeDocId, pageId }),
    [activeDocId]
  );
  const setScale = (scale) =>
    dispatch({ type: "SET_SCALE", id: doc.id, scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale)) });

  const userZoom = (scale) => {
    setFitActive(false);
    setScale(scale);
  };

  const jumpToPage = (n) => {
    if (!doc) return;
    const t = Math.max(1, Math.min(pages.length, Math.trunc(n)));
    const pg = pages[t - 1];
    if (pg) setActivePage(pg.id);
  };

  const fitToWidth = () => {
    if (!doc) return;
    const avail = (mainRef.current?.clientWidth || window.innerWidth) - 48;
    const pg = pages[Math.max(0, activeIndex)];
    const rotated = pg && (pg.rotation === 90 || pg.rotation === 270);
    const pw = (rotated ? pg?.height : pg?.width) || 595;
    setScale(avail / pw);
    setFitActive(true);
  };

  useEffect(() => setFitActive(false), [activeDocId]);

  const commitAnnotations = useCallback(
    (pageId, anns) => {
      setDocStatus(activeDocId, storageMode === "local" ? "saving" : "session");
      dispatch({
        type: "COMMIT",
        id: activeDocId,
        pages: docs.find((d) => d.id === activeDocId).pages.map((p) =>
          p.id === pageId ? { ...p, annotations: anns } : p
        ),
      });
    },
    [activeDocId, docs, storageMode]
  );

  const rotatePage = (pageId) =>
    commit(pages.map((p) => (p.id === pageId ? { ...p, rotation: ((p.rotation || 0) + 90) % 360 } : p)));

  const deletePage = (pageId) => {
    if (pages.length <= 1) {
      toast.error("A document needs at least one page.");
      return;
    }
    commit(pages.filter((p) => p.id !== pageId));
  };

  const reorder = (from, to) => {
    const next = [...pages];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
  };

  const refSize = () => {
    const ref = pages[Math.min(activeIndex >= 0 ? activeIndex : 0, pages.length - 1)];
    return { width: ref?.width || 595, height: ref?.height || 842 };
  };

  const addPage = (index, kind, lineStyle) => {
    const { width, height } = refSize();
    const page = { id: newPageId(), kind: "blank", lineStyle, width, height, rotation: 0, annotations: [] };
    const next = [...pages];
    next.splice(index, 0, page);
    commit(next);
    setActivePage(page.id);
    toast.success("Blank page inserted");
  };

  const insertImage = (dataUrl, iw, ih) => {
    const width = 595;
    const height = Math.max(200, Math.round((595 * ih) / iw));
    const page = { id: newPageId(), kind: "image", imageDataUrl: dataUrl, width, height, rotation: 0, annotations: [] };
    const next = [...pages];
    next.splice(imgDlg.index, 0, page);
    commit(next);
    setActivePage(page.id);
    toast.success("Image page inserted");
  };

  const toggleSelect = (id) => {
    const n = new Set(doc.selected);
    n.has(id) ? n.delete(id) : n.add(id);
    dispatch({ type: "SET_SELECTED", id: doc.id, selected: n });
  };

  const downloadDoc = async () => {
    if (!doc || !pages.length) return;
    setLoading(true);
    try {
      const bytes = await buildPdf(pages, sources);
      const filename = `${doc.name || "document"}.pdf`;
      const file = new File([bytes], filename, { type: "application/pdf" });
      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filename });
          toast.success("Shared your edited PDF");
          return;
        } catch (err) {
          if (err && err.name === "AbortError") return; // user dismissed the share sheet
          // otherwise fall through to a normal download
        }
      }
      downloadBytes(bytes, filename);
      toast.success("Downloaded edited PDF to your device");
    } catch (e) {
      toast.error("Could not export this PDF");
    } finally {
      setLoading(false);
    }
  };

  const hasDoc = !!doc;
  const activeStatus = statuses[activeDocId] || (storageMode === "session" ? "session" : "idle");

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background text-foreground">
      <TopBar
        theme={theme}
        toggleTheme={toggle}
        hasDoc={hasDoc}
        saveStatus={activeStatus}
        onOpenFile={openFile}
        onDownload={downloadDoc}
        onBlank={newBlankDoc}
        onStorage={() => setStorageDlg(true)}
        undo={() => dispatch({ type: "UNDO", id: doc.id })}
        redo={() => dispatch({ type: "REDO", id: doc.id })}
        canUndo={(doc?.past.length || 0) > 0}
        canRedo={(doc?.future.length || 0) > 0}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
        onAddPage={(style) => addPage(activeIndex < 0 ? pages.length : activeIndex + 1, "blank", style)}
        onImage={() => setImgDlg({ open: true, index: activeIndex < 0 ? pages.length : activeIndex + 1 })}
        scale={doc?.scale || 1.4}
        onZoomIn={() => userZoom((doc?.scale || 1.4) + 0.2)}
        onZoomOut={() => userZoom((doc?.scale || 1.4) - 0.2)}
        onFitWidth={fitToWidth}
        fitActive={fitActive}
        busy={loading}
      />

      <Tabs
        docs={docs}
        activeDocId={activeDocId}
        statuses={statuses}
        onActivate={(id) => dispatch({ type: "ACTIVATE", id })}
        onClose={(id) => dispatch({ type: "CLOSE", id })}
        onReorder={(from, to) => dispatch({ type: "MOVE_DOC", from, to })}
        onNew={() => openInputRef.current?.click()}
      />

      <input
        ref={openInputRef}
        data-testid="tab-open-input"
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) openFile(file);
        }}
      />

      <div className="flex-1 w-full flex overflow-hidden relative">
        {hasDoc && sidebarOpen && (
          <>
            {isMobile && (
              <div
                data-testid="sidebar-backdrop"
                className="absolute inset-0 z-30 bg-black/40"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            <Sidebar
              isMobile={isMobile}
              pages={pages}
              sources={sources}
              activePageId={doc.activePageId}
              setActivePage={(id) => {
                setActivePage(id);
                if (isMobile) setSidebarOpen(false);
              }}
              selected={doc.selected}
              toggleSelect={toggleSelect}
              onReorder={reorder}
              onRotate={rotatePage}
              onDelete={deletePage}
              onAddPage={addPage}
              onRequestImage={(index) => setImgDlg({ open: true, index })}
              onCollapse={() => setSidebarOpen(false)}
            />
          </>
        )}

        <main ref={mainRef} className="flex-1 h-full bg-canvas overflow-hidden relative flex flex-col" data-testid="canvas-area">
          {hasDoc && !sidebarOpen && (
            <button
              data-testid="sidebar-expand-btn"
              onClick={() => setSidebarOpen(true)}
              className="absolute top-3 left-3 z-30 h-9 w-9 rounded-lg bg-card border border-border shadow flex items-center justify-center hover:bg-muted"
              title="Show pages panel"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}

          {!hasDoc ? (
            <StartScreen
              recents={recents}
              onOpenFile={openFile}
              onOpenRecent={openRecent}
              onRemoveRecent={removeRecentFile}
              onOpenDevice={() => {}}
              supportsFS={false}
              loading={loading}
              dragOver={dragOver}
              setDragOver={setDragOver}
            />
          ) : (
            <>
              <Reader
                doc={doc}
                viewMode="scroll"
                setActivePage={setActivePage}
                onCommit={commitAnnotations}
                onSetScale={userZoom}
                toolState={{ tool, color, size, opacity, straight }}
              />
              <Toolbar
                tool={tool}
                setTool={setTool}
                color={color}
                setColor={setColor}
                size={size}
                setSize={setSize}
                opacity={opacity}
                setOpacity={setOpacity}
                straight={straight}
                setStraight={setStraight}
              />
              {pages.length > 1 && (
                <PageJump
                  current={activeIndex < 0 ? 1 : activeIndex + 1}
                  total={pages.length}
                  onJump={jumpToPage}
                />
              )}
            </>
          )}
        </main>
      </div>

      <ImageInsertDialog
        open={imgDlg.open}
        onOpenChange={(v) => setImgDlg((d) => ({ ...d, open: v }))}
        onInsert={insertImage}
      />

      <StorageDialog
        open={storageDlg}
        onOpenChange={setStorageDlg}
        mode={storageMode}
        onChoose={chooseStorage}
        onClear={clearStorage}
        busy={loading}
      />

      <ConfirmDialog value={confirm} onClose={() => setConfirm(null)} />

      {loading && hasDoc && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-card border border-border px-3 py-2 shadow-lg text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Working…
        </div>
      )}
    </div>
  );
}
