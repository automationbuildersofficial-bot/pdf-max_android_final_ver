# PDF Studio — Product Requirements & Progress

## Original problem statement
A browser-based PDF reader/editor with: edit mode (pen/pencil/highlighter with 10–20 colours,
intensity, straight/auto + freehand modes), eraser, undo/redo, text & audio comments (cancelable),
website links (cancelable), shapes, page reorder, page extraction by selection, insert writing
pages (blank/ruled/etc.) between pages, delete pages, rotate pages, insert image pages (with
crop/edit + controllable resolution), merge & split PDFs, crop pages, a PowerPoint-style page
sidebar, night mode, Google-only accounts, Google Drive edit/sync (with permission), and a
first-time tutorial. Later additions: "Continue as guest" login, device document access with
save-back (File System Access API), tabs for multiple PDFs, on-device recent-files history,
collapsible sidebar, movable annotation toolbar, and multiple reading modes (continuous scroll
default, single page, book/two-page).

## Current direction (2026-06) — Android-optimized, local-only web app
Per the user, the product is a **web app optimized for Android (not native)**, reliability-first,
with heavy extras removed from the editing flow. **Login/auth was removed** — the app opens
straight into the editor. All document content stays on-device (IndexedDB + localStorage);
nothing is uploaded. Cloud sync and nonessential PDF features are deferred.

## Architecture
- **Frontend**: React (CRACO), Tailwind + shadcn/ui, lucide-react. PDF render via `pdfjs-dist`
  (worker from cdnjs), structural/export via `pdf-lib` (WYSIWYG raster export). **No auth.**
  On-device storage via IndexedDB (full edit state + source PDF blobs) + localStorage
  (recents list + storage-mode consent). Storage consent: "local" (persist) vs "session" (memory only).
- **Backend**: FastAPI + MongoDB exists but is NOT used for document content in the current local-only flow.
- **Key files**: `pages/Workspace.js` (multi-doc reducer/orchestrator, storage consent, doc ops),
  `components/editor/*` (TopBar, Sidebar, Reader, PageView, Toolbar, Tabs, StartScreen,
  ImageInsertDialog, StorageDialog, ConfirmDialog), `lib/pdfEngine.js`, `lib/exportPdf.js`,
  `lib/storage.js`, `lib/constants.js`.

## User personas
- Students/professionals annotating and reorganising PDFs entirely in the browser, privately on device.

## Core requirements (static)
- Client-side editing; no document leaves the device unless the user exports/saves.
- Google-only accounts + guest mode.

## Implemented (2026-06)
- **Android local-only rewrite (streamlined)** — removed login/auth entirely (`App.js` routes
  straight to `Workspace`); removed heavy extras from the editing flow (merge/split/extract,
  view-mode switcher, tutorial, pencil/shapes/text/link tools, 20-colour palette). Toolbar is now
  4 tools (Scroll&zoom / Pen / Highlighter / Eraser) + 6 colours + ink settings.
- **Storage consent** — first-load `StorageDialog` asks "Allow local storage" (IndexedDB autosave)
  vs "Session only" (memory, lost on reload). Re-openable from TopBar → "Device storage & permission";
  includes "Delete all local copies" (via ConfirmDialog). Mode stored in `localStorage pdf_storage_mode`.
- **Tabs** — multi-doc tabs with per-doc save-status dot (`statuses` map); open another / new blank
  / switch / close keep other docs intact.
- **Zoom** — TopBar zoom-in/zoom-out buttons with % label, plus two-finger **pinch-to-zoom** in the
  Reader (touch listeners on the scroll container, non-passive). Vertical scroll works in all tools.
- **Draw/erase** — pen & highlighter draw+persist; eraser removes strokes (verified pixel diff 678→0)
  and commits on pointer-up. Add blank/ruled/grid/dotted pages; insert image pages (crop/rotate/res).
- **Download** — `save-device-btn` builds the edited PDF (pdf-lib raster) and downloads to device.
- **Persistence** — full edit state + source PDF blobs saved to IndexedDB when "local" mode; recents
  list in localStorage; reopen from Recent files after reload (verified).
- **Verified 2026-06**: testing agent iteration_5.json — 16/16 P0 flows pass on desktop (1280x800)
  and mobile (390x844); sidebar overlay+backdrop+thumb-tap-close working; no console errors.
- **Enhancements (2026-06)** — verified in iteration_6/7:
  - Tab-bar "+" now opens a PDF picker (open another PDF) instead of a blank doc.
  - **Fit-to-screen-width** button (`fit-width-btn`) in TopBar next to zoom controls; zoom-level
    label rebased to `scale*100` (100% = actual size).
  - **Share/Download**: `save-device-btn` tries the native Web Share sheet with the PDF file
    (Android) and falls back to a normal download when Web Share (files) is unsupported.
  - **Drag-to-reorder tabs** using POINTER events (works on Android touch, not just mouse);
    tap still activates, close button excluded from drag; `MOVE_DOC` reducer action.

## Earlier implemented (pre-rewrite, mostly superseded)
  collapses to a compact page-nav + overflow menu (`mobile-menu-btn`) below 768px; PDF pages auto-fit
  the screen width on open (no forced horizontal scroll); pages sidebar becomes an opaque overlay
  drawer (+ backdrop) that auto-closes on page tap and defaults CLOSED on mobile; annotation canvas
  allows touch-scroll in the default 'select' tool (touch-action toggles per tool); floating toolbar
  wraps instead of hiding tools. Verified 7/7 mobile flows + desktop regression (iteration_4.json).
- Auth: Google OAuth (code flow, reads GOOGLE_CLIENT_ID/SECRET) + **Continue as guest**. JWT + /api/auth/me.
- Reader: continuous-scroll (default), single-page, book/two-page modes; lazy page painting; page rotation.
- Annotations: pen, pencil, highlighter (20 colours, size, opacity/flow, straight vs freehand),
  shapes (line/arrow/rect/ellipse), text comments, website links, object eraser, undo/redo.
- Pages: PowerPoint-style thumbnail sidebar (collapsible), drag-reorder, rotate, delete, select→extract,
  insert blank/ruled/grid/dotted pages, insert image page (crop + rotate + resolution), merge, split.
- Export: download edited PDF (annotations flattened), extract selected pages, split into two files.
- Device: open-from-device + **Save back to the original file** (File System Access API, with a
  permission confirmation), fallback to Save/Download.
- Multi-doc **tabs**; **recent-files** history stored on device (IndexedDB bytes + localStorage list),
  reopen from recents.
- Movable floating toolbar (drag handle, double-click to reset). Night mode. First-time tutorial.
- Testing: backend 17/17 pytest pass; frontend flows verified (drawing verified via canvas pixel diff);
  critical flex-shrink layout bug fixed; toolbar-reset persistence fixed.

## Backlog / remaining
- **P1**: Persist annotations/edits per file across full reloads — DONE (local mode saves full state).
- **P2**: Optional export quality/resolution setting (current raster export is scale=2, large files).
- **P2**: Vector (selectable-text) export option; page crop UI; broader image-insert editing.
- **P3** (deferred per user): cloud sync / Google Drive; audio comments; native Android APK (needs a
  separate Expo/React Native project — NOT possible to convert this web project in place).
- **Note**: idle autosave-indicator label "On this device" could be clarified, but the first-load
  storage dialog forces a choice so this is low priority.
