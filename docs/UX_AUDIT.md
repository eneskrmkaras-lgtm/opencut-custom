# OpenCut — UX & Architecture Audit

**Repository:** `opencut-custom` (personal fork, no upstream PRs intended)
**Scope:** `apps/web` (Next.js video editor)
**Audit date:** 22 May 2026
**Mode:** Read-only — no code modified.

This document is a baseline. It maps what is here today, where the friction is, what is risky to touch, and a beginner-friendly path to redesign the experience.

---

## 1. Project structure

### 1.1 Monorepo layout

```
opencut-custom/
├── apps/
│   ├── web/         Next.js 16 web editor (the focus of this audit)
│   └── desktop/     Rust GPUI desktop shell (out of scope)
├── rust/            Migration target for cross-platform business logic (per AGENTS.md)
├── Cargo.toml       Workspace
├── README.md
└── AGENTS.md        Architectural intent: "apps own UI, never logic"
```

`AGENTS.md` declares an in-progress migration: all non-UI logic should move into `rust/`. In practice today, `apps/web/src/core` still owns most of the editor's runtime logic in TypeScript.

### 1.2 Web app stack

| Concern               | Choice                                                                  |
| --------------------- | ----------------------------------------------------------------------- |
| Framework             | **Next.js 16** with the App Router, **Turbopack** dev                   |
| UI runtime            | **React 19**                                                            |
| Styling               | **Tailwind CSS v4** + **shadcn/ui** (style `new-york`, base `neutral`)  |
| Component primitives  | **Radix UI** (accordion, dialog, dropdown, select, tooltip, etc.)       |
| Icons                 | **HugeIcons** (primary), **lucide-react**, **react-icons** (mixed)      |
| State (UI)            | **Zustand** (multiple stores, several persisted to `localStorage`)      |
| State (domain)        | Custom `EditorCore` singleton with per-feature managers                 |
| Layout / panes        | `react-resizable-panels`                                                |
| Drag and drop         | `@hello-pangea/dnd`                                                     |
| Animation             | `motion` (Framer Motion successor)                                      |
| Forms / validation    | `react-hook-form`, `zod`                                                |
| Media                 | `mediabunny` (decode), `wavesurfer.js`, `soundtouchjs`                  |
| Editor math / wasm    | `opencut-wasm` (timecode, media-time math)                              |
| ML                    | `@huggingface/transformers` (used by `transcription/`)                  |
| Auth / data           | `better-auth`, `drizzle-orm`, `pg`/`postgres`, `@upstash/redis`         |
| Anti-bot              | `botid`                                                                 |
| Analytics             | `databuddy.cc` (script tag in `app/layout.tsx`)                         |
| Hosting               | Cloudflare via `@opennextjs/cloudflare`                                 |
| Toasts                | `sonner`                                                                |
| Content (blog/changelog) | `@content-collections/*` + remark/rehype                             |
| Package manager       | **bun 1.2.18**                                                          |

### 1.3 Build / dev commands (`apps/web/package.json`)

| Script               | What it does                                              |
| -------------------- | --------------------------------------------------------- |
| `bun run dev`        | Next dev with Turbopack                                   |
| `bun run build`      | Next build                                                |
| `bun run start`      | Next start (production node server)                       |
| `bun run preview`    | OpenNext + Cloudflare local preview                       |
| `bun run deploy`     | OpenNext build + Cloudflare deploy                        |
| `bun run lint(:fix)` | ESLint over `src`                                         |
| `bun run format`     | Prettier over `src`                                       |
| `bun run db:*`       | Drizzle generate / migrate / push (local + prod)          |

### 1.4 Important config files

- `apps/web/next.config.ts` — wraps with `withBotId` and `withContentCollections`; standalone output; production source maps on; remote image patterns whitelist Unsplash, GitHub avatars, Iconify, etc.
- `apps/web/components.json` — shadcn config; aliases live under `@/components`, `@/lib`, `@/hooks`.
- `apps/web/tsconfig.json` — TypeScript paths.
- `apps/web/postcss.config.mjs` + `apps/web/src/app/globals.css` — Tailwind v4 inline theme + custom `.panel` token override + dark mode tokens.
- `apps/web/drizzle.config.ts` + `apps/web/migrations/` — DB schema.
- `apps/web/wrangler.jsonc` + `apps/web/open-next.config.ts` — Cloudflare Workers config.
- `apps/web/Dockerfile` — node-based build for non-CF deployments.
- `apps/web/.env.example` — required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, Upstash, Marble CMS, Freesound credentials.
- `apps/web/content-collections.ts` — content collection definitions (blog, changelog).
- `.github/workflows/bun-ci.yml` — CI.

### 1.5 `apps/web/src` map (high level)

```
app/                Next.js routes
  page.tsx          Landing
  projects/         Project gallery
  editor/[project_id]/ Editor shell
  + marketing routes (blog, changelog, contributors, sponsors, roadmap, brand, terms, privacy)
  + api/, sitemap.ts, robots.ts, rss.xml/

components/
  editor/           Editor-specific React (header, panels, onboarding, mobile gate, scenes-view, export-button)
  landing/          Hero + decorative handlebars
  ui/               shadcn primitives
  header.tsx, footer.tsx, theme-toggle.tsx, ...

core/               EditorCore singleton + managers (timeline, playback, scenes, project, media, renderer, command, save, audio, selection, clipboard, diagnostics)
editor/             use-editor hook + a couple of Zustand stores + cancel-interaction
panels/             Layout defaults (`PANEL_CONFIG`)

timeline/           Timeline domain (~30 files, multiple subfolders)
preview/            Preview canvas, viewport, overlays, snapping
media/              Upload, paste, processing, thumbnail, waveform
export/             Format/quality enums, mime helpers
selection/, clipboard/, commands/, actions/   Editor mechanics
project/, services/storage/, services/renderer/, services/transcription/, services/video-cache/, services/waveform-cache/
text/, stickers/, graphics/, masks/, effects/, retime/, ripple/, speed/, gradients/, fonts/, sounds/, subtitles/, transcription/, fps/, animation/, canvas/, params/, types/, utils/, wasm/
guides/, bookmarks/ (under timeline), changelog/, blog/, feedback/, diagnostics/
```

There are many small domain folders; see §3 for the user-facing component map.

---

## 2. Current user experience

### 2.1 Top-level routes

| Route                       | Component                                         | Purpose                                        |
| --------------------------- | ------------------------------------------------- | ---------------------------------------------- |
| `/`                         | `app/page.tsx` → `Hero` + `Header` + `Footer`     | Marketing landing                              |
| `/projects`                 | `app/projects/page.tsx`                           | Project gallery (grid/list, search, sort)      |
| `/editor/[project_id]`      | `app/editor/[project_id]/page.tsx`                | The editor                                     |
| `/blog`, `/changelog`, `/roadmap`, `/contributors`, `/sponsors`, `/brand`, `/terms`, `/privacy` | Static / content pages | Marketing & legal                              |

### 2.2 First-time user flow

1. Lands on `/`. Hero headline ("The open source / Video editor") with decorative animated **handlebars** the user can drag (purely visual — has no functional purpose). Tagline: "A simple but powerful video editor that gets the job done. Works on any platform." Single CTA: **Try early beta** → `/projects`.
2. `/projects` mounts and immediately shows two dialogs in parallel:
   - `MigrationDialog` (for legacy storage)
   - `StoragePersistenceDialog` (for OPFS / persistent storage)
   - Plus `ChangelogNotification` if there is unread changelog content.
3. With no projects saved, an `EmptyState` shows: "No projects yet" + "Create your first project". Clicking it calls `editor.project.createNewProject({ name: "New project" })` and routes to `/editor/<id>`.
4. The editor route, on mount, shows:
   - `MobileGate` — hard-blocks anything below 1024px viewport with a "Desktop only (for now)" screen and a **Take a look anyway** override (persisted in `localStorage["mobile-acknowledged"]`).
   - `Onboarding` — a 3-step modal:
     - Step 1: "Welcome to OpenCut Beta!"
     - Step 2: "⚠️ This is a super early beta!"
     - Step 3: "🦋 Have fun testing!" with a Discord link.
     - Setting `hasSeenOnboarding=true` in `localStorage` dismisses it forever.
   - `MigrationDialog` again (defensive).
   - `ChangelogNotification` again.
   - If the renderer initialised in degraded mode, a top banner says "For the best experience, open OpenCut in Chrome." with a small dismiss button.
5. Once dialogs are dismissed, the user faces the editor with empty Assets / Preview / Properties / Timeline panels. **No coach marks, no inline guidance, no "import your first clip" call to action.**

### 2.3 Importing media

There are four parallel import paths:

1. **File picker** — Click *Import* in `MediaView` actions → hidden `<input>` accepts `image/*,video/*,audio/*` (multiple).
2. **Drag and drop into the assets panel** — `useFileUpload` adds `dragProps` to the panel; full-panel drop overlay (`MediaDragOverlay`) when dragging.
3. **Paste anywhere** — `usePasteMedia` is wired in `EditorLayout` and intercepts `paste` events globally; pastes either media files (creates an asset + auto-inserts at playhead via a batched command) or non-media (delegates to `editor.clipboard.paste()`).
4. **Drag from disk straight onto the timeline** — handled by `useTimelineDragDrop` inside the timeline.

Once imported, files run through `processMediaAssets({ files, onProgress })`, with `showMediaUploadToast` providing user feedback. After processing, assets show in the panel (grid or list) and can be dragged onto the timeline or double-tap-inserted at the current playhead via `MediaAssetDraggable.onAddToTimeline`.

### 2.4 Timeline editing

The timeline is a custom-built grid of:

- `TimelineToolbar` — left cluster: split, split-left, split-right, link/unlink source audio, duplicate, freeze (disabled, "coming soon"), delete, separator, bookmark toggle, graph editor (curve editor popover). Center: scene selector (`SplitButton` + `ScenesView` sheet). Right: snapping toggle, ripple-editing toggle, separator, zoom out/slider/zoom in.
- `TrackLabelsPanel` (left column): per-track icon, mute toggle (audio tracks), hide toggle (visual tracks), and an optional `PropertyTree` for keyframe lanes when an element is expanded.
- `TimelineRuler` + `TimelineBookmarksRow` (top, scroll-synced).
- Tracks scroll surface — multi-track, with overlay tracks above the main track and audio tracks below. Per-element interactions: drag/move (group-aware), resize (left/right), split, expand keyframes, context menu (paste / mute / hide / delete track).
- `TimelinePlayhead` overlays everything; clickable ruler to seek.
- Box selection, shift/ctrl additive selection, snapping (with snap indicator), edge-auto-scroll while dragging, persisted scroll/zoom/playhead state via `editor.project.getTimelineViewState()`.
- A single non-passive wheel listener owns zoom (`ctrl/meta`), horizontal scroll (`shift` or dominant `deltaX`), and vertical scroll. This intentionally suppresses native browser zoom over the timeline.

Keyboard: `useKeyboardShortcutsHelp` exposes a registry of action shortcuts; tooltips on toolbar buttons inline the keys.

### 2.5 Preview / playback

`PreviewPanel` mounts a wgpu canvas via `CanvasRenderer` directly into a `div`. State:

- `RenderTreeController` rebuilds the scene render tree from tracks + media + canvas size + background whenever any of those change (deep-compare effect).
- `useRafLoop(render)` ticks every frame; `editor.playback` exposes seek/play/pause and per-frame events.
- `PreviewToolbar` (bottom of the preview): editable timecode (current / total in `HH:MM:SS:FF`), play/pause button, zoom select (`Fit`, presets via `PREVIEW_ZOOM_PRESETS`), fullscreen toggle. There is a commented-out **Grid/Guide popover** marked `v0.4.0`.
- Right-click context menu (`PreviewContextMenu`) toggles overlay visibility (e.g. bookmark notes, guides) and fullscreen.
- Wheel zooms (ctrl/meta) and pans (when zoomed in) the viewport.

### 2.6 Properties

`PropertiesPanel` reads the current selection via `useElementSelection()`:

- **0 elements** → `EmptyView`: "It's empty here / Click an element on the timeline to edit its properties".
- **1 element** → secondary vertical icon tab strip with element-type-aware tabs from `registry.tsx`. Tabs differ per type:
  - `text`: Text, Transform, Blending
  - `video`: Transform, (Audio if asset has audio), Speed, Blending, Masks, Effects
  - `image`: Transform, Blending, Masks, Effects
  - `sticker`: Transform, Blending, Effects
  - `graphic`: Graphic, Transform, Blending, Masks, Effects
  - `audio`: Audio, Speed
  - `effect`: Effects (standalone)
- **>1 element** → centred message: `"{n} elements selected.0"` ← **stray `.0` typo** in `properties/index.tsx`.

Last-used tab per element type is persisted via `usePropertiesStore`.

### 2.7 Export / render

Triggered from the gradient **Export** button in `EditorHeader` (only enabled when there is an active project).

- Opens a `Popover` (`ExportPopover`) — *not* a modal.
- Three collapsible sections, **all collapsed by default** (`defaultOpen={false}`):
  - **Format**: MP4 (H.264) / WebM (VP9) radio.
  - **Quality**: low / medium / high (recommended) / very_high radio.
  - **Audio**: single "Include audio in export" checkbox.
- One **Export** button. Progress UI (current % / 100% + progress bar + Cancel) replaces the form during export.
- On success, the file is downloaded via `downloadBuffer` with the project name + extension.
- Errors render an `ExportError` block with **Copy** and **Retry** buttons.
- **Closing the popover at any point cancels and clears the export.** This is implemented in `handlePopoverOpenChange` (`!open` → `editor.project.cancelExport()` + `clearExportState()`). A user clicking outside accidentally will lose the in-progress render.

### 2.8 Settings / preferences

There is no dedicated *Settings* route. What exists:

- **Assets panel → Settings tab** (`SettingsView`) — project-level settings (canvas size, background, etc., per `canvas/sizes.ts` + project settings).
- **Theme toggle** in the header (light / dark / system via `next-themes`).
- **Keyboard shortcuts dialog** in the editor's project dropdown.
- Various **persisted Zustand slices** (`panel-sizes`, `assets-panel`, `projects-view-mode`, `timeline-store`) act as implicit user preferences.
- No explicit account / profile / preferences UI surfaced anywhere.

---

## 3. UI component map

### 3.1 Layout

| Region                  | Component                                                  | File                                                   |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| Marketing shell         | `Header`, `Footer`, `BasePage`                             | `components/header.tsx`, `components/footer.tsx`, `app/base-page.tsx` |
| Landing hero            | `Hero`, `Handlebars` (decorative)                          | `components/landing/*.tsx`                             |
| Projects shell          | `ProjectsHeader`, `ProjectsToolbar`, `ProjectsSkeleton`, `EmptyState` | `app/projects/page.tsx`                      |
| Editor shell            | `Editor`, `EditorLayout`, `DegradedRendererBanner`, `MobileGate`, `EditorProvider` | `app/editor/[project_id]/page.tsx` + `components/providers/editor-provider.tsx` |
| Resizable layout        | `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` | `components/ui/resizable.tsx`                          |

### 3.2 Editor header / toolbar

| Component               | Role                                                       | File                                       |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| `EditorHeader`          | Top bar of editor                                          | `components/editor/editor-header.tsx`      |
| `ProjectDropdown`       | Logo button + Exit/Shortcuts/Discord (rename/delete states present but **no menu items wired** — see §4) | same file |
| `EditableProjectName`   | Inline-editable title (`<input>` with `fieldSizing: content`) | same file                              |
| `FeedbackPopover`       | Feedback collector                                         | `feedback/components/feedback-popover.tsx` |
| `ExportButton`          | Custom-styled gradient trigger + `ExportPopover` + `ExportError` | `components/editor/export-button.tsx`|
| `ThemeToggle`           | Light/dark/system                                          | `components/theme-toggle.tsx`              |

### 3.3 Sidebar / panels

**Assets panel** (left of the editor's top row):

| Component                  | File                                                            |
| -------------------------- | --------------------------------------------------------------- |
| `AssetsPanel`              | `components/editor/panels/assets/index.tsx`                     |
| `TabBar` + `FadeOverlay`   | `components/editor/panels/assets/tabbar.tsx`                    |
| `useAssetsPanelStore` (Zustand, persisted) | `components/editor/panels/assets/assets-panel-store.tsx` |
| `MediaView` + `MediaActions`, `MediaItemList`, `MediaPreview`, `MediaTypePlaceholder`, `MediaItemWithContextMenu` | `components/editor/panels/assets/views/assets.tsx` |
| `MediaDragOverlay`, `DraggableItem` | `components/editor/panels/assets/{drag-overlay,draggable-item}.tsx` |
| `PanelView` (shared frame)            | `components/editor/panels/assets/views/base-panel.tsx`          |
| `SettingsView`             | `components/editor/panels/assets/views/settings/`               |
| Other tab views            | `subtitles/components/assets-view`, `sounds/...`, `text/...`, `stickers/...`, `effects/...` |

Tabs (`TAB_KEYS`): `media`, `sounds`, `text`, `stickers`, `effects`, `transitions` ("coming soon"), `captions`, `adjustment` ("coming soon"), `settings`.

**Properties panel** (right of the editor's top row):

| Component               | File                                                              |
| ----------------------- | ----------------------------------------------------------------- |
| `PropertiesPanel`       | `components/editor/panels/properties/index.tsx`                   |
| `EmptyView`             | `components/editor/panels/properties/empty-view.tsx`              |
| `getPropertiesConfig`   | `components/editor/panels/properties/registry.tsx`                |
| Tab bodies              | `components/editor/panels/properties/components/element-params-tab.tsx`, plus tabs from `effects/`, `masks/`, `speed/`, `graphics/` |
| `usePropertiesStore`    | `components/editor/panels/properties/stores/properties-store.ts`  |

### 3.4 Timeline

| Component                                              | File                                                |
| ------------------------------------------------------ | --------------------------------------------------- |
| `Timeline` (root)                                      | `timeline/components/index.tsx`                     |
| `TimelineToolbar`                                      | `timeline/components/timeline-toolbar.tsx`          |
| `TimelineRuler`, `TimelineTick`                        | `timeline/components/timeline-ruler.tsx`, `timeline-tick.tsx` |
| `TimelinePlayhead`                                     | `timeline/components/timeline-playhead.tsx`         |
| `TimelineTrackContent`                                 | `timeline/components/timeline-track.tsx`            |
| `TimelineElement`                                      | `timeline/components/timeline-element.tsx`          |
| `TrackLabelsPanel`, `TimelineTrackRows`, `PropertyTree` (inside `index.tsx`) | same file                |
| `SnapIndicator`, `DragLine`, `AudioVolumeLine`, `AudioWaveform` | `timeline/components/{...}.tsx`            |
| Selection, layout helpers                              | `timeline/components/{layout,track-layout,expanded-layout,selection-hit-testing,interaction,layers,theme}.ts` |
| Bookmarks / scenes / graph editor                      | `timeline/bookmarks/`, `timeline/components/graph-editor/`, `components/editor/scenes-view.tsx` |
| Hooks                                                  | `timeline/hooks/*` (zoom, seek, drag-drop, edge-auto-scroll, container-size, scroll-position, playhead, element interaction/selection, resize) |

### 3.5 Preview

| Component                                         | File                                              |
| ------------------------------------------------- | ------------------------------------------------- |
| `PreviewPanel`, `PreviewCanvas`, `RenderTreeController` | `preview/components/index.tsx`              |
| `PreviewToolbar`, `TimecodeDisplay`, `PlayPauseButton`, `ZoomSelect` | `preview/components/toolbar.tsx`  |
| `PreviewViewportProvider`, `usePreviewViewport`   | `preview/components/preview-viewport.tsx`         |
| `PreviewInteractionOverlay`, `PreviewOverlayLayer`, `TransformHandles`, `MaskHandles`, `SnapGuides`, `TextEditOverlay`, `GuidePopover` | `preview/components/*.tsx` |
| `PreviewContextMenu`                              | `preview/components/context-menu.tsx`             |

### 3.6 Modals and dialogs

| Dialog                        | File                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `Onboarding` (3-step)         | `components/editor/onboarding.tsx`                                            |
| `MigrationDialog`             | `project/components/migration-dialog.tsx`                                     |
| `StoragePersistenceDialog`    | `services/storage/components/storage-persistence-dialog.tsx`                  |
| `RenameProjectDialog`         | `project/components/rename-project-dialog.tsx`                                |
| `DeleteProjectDialog`         | `project/components/delete-project-dialog.tsx`                                |
| `ProjectInfoDialog`           | `project/components/project-info-dialog.tsx`                                  |
| `ShortcutsDialog`             | `actions/components/shortcuts-dialog.tsx`                                     |
| `ChangelogNotification`       | `changelog/components/changelog-notification.tsx`                             |
| `ScenesView` (sheet)          | `components/editor/scenes-view.tsx`                                           |
| `MobileGate`                  | `components/editor/mobile-gate.tsx`                                           |
| `ExportPopover` / `ExportError` | `components/editor/export-button.tsx`                                       |
| `GraphEditorPopover`          | `timeline/components/graph-editor/popover.tsx`                                |
| `FeedbackPopover`             | `feedback/components/feedback-popover.tsx`                                    |

### 3.7 shadcn/ui primitives

`components/ui/` ships the standard shadcn set (button, dialog, dropdown-menu, popover, tooltip, sheet, tabs, slider, scroll-area, table, accordion, alert-dialog, breadcrumb, calendar, card, checkbox, collapsible, color-picker, context-menu, font-picker, form, hover-card, input, label, menubar, navigation-menu, number-field, progress, prose, radio-group, react-markdown-wrapper, resizable, select, separator, skeleton, sonner, spinner, split-button, switch, textarea, toast, toggle, toggle-group, plus an `editable-timecode.tsx`).

The `Button` variant set is unusually wide — it has ten variants (`default`, `background`, `destructive`, `destructive-foreground`, `caution`, `outline`, `secondary`, `text`, `ghost`, `link`) and five sizes (`default`, `sm`, `lg`, `icon`, `text`). It also has the implicit rule `effectiveSize = size ?? (variant === "text" ? "text" : "default")`, meaning the `text` variant silently snaps to a different size. This is fine but adds cognitive load.

---

## 4. UX problems

### 4.1 Confusing flows

- **Three dialogs can stack on first project visit** — `MigrationDialog` + `StoragePersistenceDialog` + `ChangelogNotification`. Their order and dismissal interaction is unclear.
- **`Onboarding` does not actually onboard.** It is three pieces of marketing copy ("Welcome / It's a beta / Join Discord"). It does not say *what to do first*, where the import button is, or how to drag to the timeline.
- **Project dropdown has dead branches.** `EditorHeader.ProjectDropdown` pre-creates state (`openDialog: "delete" | "rename" | "shortcuts"`) and renders `RenameProjectDialog` + `DeleteProjectDialog`, but the dropdown menu only shows **Exit project / Shortcuts / Discord**. There is no visible way to open Rename or Delete from the editor — yet the same code keeps the dialogs mounted. This is unfinished UX.
- **Closing the export popover cancels the export.** A misclick outside the popover during a long render aborts it silently. The user gets no confirmation, no resume.
- **"Coming soon" tabs live alongside production tabs.** `transitions` and `adjustment` show plain text "coming soon..." inside what looks like a real workspace tab. They should be hidden, badged, or routed somewhere.
- **Two different sort idioms.** Projects page sort uses `DropdownMenuCheckboxItem` (selectable rows). Media panel sort uses plain `DropdownMenuItem` with a literal `↑/↓` arrow appended to the label. Same concept, two visual languages.
- **`ScenesView` "Select" button** doubles as Cancel and toggles a multi-select / delete mode. It is not labelled as such in advance and has no destructive guard around the **main** scene besides a disabled state that the user has to discover.

### 4.2 Too many clicks

- **Export always requires opening 3 collapsed sections.** Format / Quality / Audio sections all default to closed. Users always need to expand them to verify settings before clicking the only Export button. A flat layout (or last-used state) would save 3 clicks per export.
- **Renaming a project requires double-clicking the title.** It is only a click + select implicitly via `requestAnimationFrame`, but there is no caret/edit affordance shown until you click. From `/projects`, renaming is only available via context menu or grid card overflow menu — there is no inline rename in the list view.
- **Importing media** still requires a tab switch (Media tab) before the Import button, despite the panel being "always Media" by default. A header-level Import (drop into anywhere) shortcut would help.
- **Switching scenes** requires opening the toolbar's Scenes split-button → side sheet → list → click. A dropdown with previews would be one click.

### 4.3 Missing empty states

- **Timeline empty state** — no content. With no clips, the timeline is just an empty grid; no "Drag a clip here to begin", no animated arrow.
- **Preview empty state** — black canvas with no helpful message. New users may think it is broken.
- **Properties empty state exists** but is generic and never references the currently-hovered element.
- **Effects / stickers / sounds / text tabs** — no audit done in this pass for their views, but in `AssetsPanel.viewMap` two tabs (`transitions`, `adjustment`) are literally just `"... coming soon"` strings, not styled empty states.
- **Search empty state on `/projects`** is good — has icon, message including the query, and a "Clear search" button. This pattern should be reused.

### 4.4 Missing onboarding / education

- No first-clip tour. No tooltips with "Drop a video here", no progress indicator like "1/3 import a clip".
- No keyboard cheat sheet on first visit (only behind a hidden menu item: project dropdown → Shortcuts).
- No sample project / template — the user is dropped into a blank document.
- No "What's new" inside the editor (the changelog notification only flags new content, it doesn't *teach*).
- The `/changelog`, `/roadmap`, and `/blog` are siloed in marketing chrome; the editor doesn't surface them.

### 4.5 Mobile / responsive

- `MobileGate` blocks anything with `window.innerWidth < 1024` and stores the override in `localStorage`. On override, the editor is functional in name only — its 2D resizable grid + complex toolbar are unusable below ~1024px. There is **no adaptive layout** at all in the editor.
- `/projects` *does* adapt (search bar collapses, view-mode buttons collapse, menu collapses). But it has a sticky double-row header (`top-0` and `top-16`) that occupies a lot of vertical space on small screens.
- The marketing landing animates the hero handlebars on touch via `pointermove`, but the handlebars are decorative; touch users get nothing meaningful from them.
- The `/projects` `SearchBar` "collapsed" prop hides the input behind a circular button on mobile — but the input is also rendered *below* the toolbar (`<SearchBar className="block md:hidden mb-4" />`), so both are visible at once. Likely accidental.

### 4.6 Accessibility

- **Track toggle icons are not buttons.** `TrackToggleIcon` renders a bare `HugeiconsIcon` with `onClick` and `cursor-pointer`. No `<button>`, no `aria-label`, no keyboard handler. Same pattern in a few other places.
- **Properties panel multi-selection typo:** `{n} elements selected.0` — visible bug.
- **`Onboarding` `DialogTitle`** uses an `sr-only` span with the title, while the visible heading is rendered separately as an `<h2>` inside the body. Net result: screen readers may announce the title twice or once oddly, and the dialog has no programmatic title at the level Radix expects.
- **Editable project name** uses `style={{ fieldSizing: "content" }}`. CSS field-sizing has limited browser support (Chromium-only at time of writing). On Safari / Firefox it will not auto-grow and may render at the default `<input>` width. There is also no label and no `aria-label` other than the implicit input.
- **Mixed icon libraries** mean inconsistent stroke widths, sizing assumptions, and (occasionally) inconsistent `aria-hidden` defaults.
- **Dialog/popover focus management** appears to rely on Radix defaults — generally fine, but the `ExportPopover` cancelling the in-flight render on `onOpenChange(false)` interacts badly with Escape-key dismissal.
- **No skip-link** on the editor page.
- **Track context menu shortcuts** show the keybinding only in tooltip text with format `(Ctrl+B or B)` — not via Radix `aria-keyshortcuts`.
- **Color-only state indicators** in the timeline (selected track row uses a single class). Likely fine, but no audit done on contrast in dark mode.

### 4.7 Inconsistencies (visual language)

- **Icon libraries:** HugeIcons (most of the editor), `lucide-react` (export popover, onboarding arrow, scenes view list-check/trash), `react-icons` (Discord, GitHub, Twitter). The same concept (e.g. delete) shows up as `Delete02Icon` (HugeIcons) and `Trash2` (lucide). And `Check` from lucide vs HugeIcons checks elsewhere.
- **Buttons:**
  - Editor toolbar uses `variant="text"` with manual `isActive` styling.
  - `ExportButton` is a hand-rolled `<button>` with hardcoded HSL/HEX gradients (`#38BDF8`, `#2567EC`, `#37B6F7`). It does not use the Button component, does not respond to theme tokens, and re-implements disabled styling.
  - Some dialogs use shadcn `<Button variant="outline">`, others raw `<button>` with `className="…"`.
- **Spacing:** mixed use of `gap-1`, `gap-1.5`, `gap-2`, `gap-2.5` for the same conceptual button row across header / panels / toolbars. Padding `p-1`, `p-1 px-2.5`, `p-3`, `p-5 px-6` vary across button sizes.
- **Labels:**
  - "All projects" (breadcrumb) vs "Projects" (header link from landing).
  - "New project" / "New" (responsive label switch in `NewProjectButton`) — reasonable, but adjacent components don't apply the same idiom.
  - "Try early beta" (landing CTA) vs "Welcome to OpenCut Beta!" (onboarding) vs "Beta" never appearing in the editor chrome itself.
  - Sort labels in projects: `Created`, `Modified`, `Name`, `Duration`. Sort labels in media: `Name`, `Type`, `Duration`, `File size`. Different keys, different verbs.
- **Colour tokens:** the export button bypasses the design tokens; the rest of the app uses `bg-foreground` / `bg-secondary` / etc. There is also a separate `.panel` selector overriding tokens *inside* panels — this is clever but means designers must remember the token has two values depending on ancestor class.
- **Empty-state visual language** varies: Properties uses a stroked icon in a circle, projects uses an icon in a rounded square, media drag-overlay uses something different again. No reusable `<EmptyState>` component.
- **Toolbar density** differs: the timeline toolbar packs ~12 buttons into 40px height; the preview toolbar uses 5 spread elements at ~48px height; the editor header has 3 elements. There is no scale/density rule.
- **Tooltip patterns:** some are `<Tooltip><TooltipTrigger asChild>…` (with provider), some inline, some inside dropdowns (which can flicker because the dropdown closes the tooltip's trigger).

### 4.8 Misc bugs spotted while reading

- `properties/index.tsx`: `"{selectedElements.length} elements selected.0"` — leftover character.
- `editor-header.tsx`: imported `RenameProjectDialog` and `DeleteProjectDialog` are mounted but never opened from the visible menu (orphan UI).
- `app/projects/page.tsx`: The mobile `<SearchBar className="block md:hidden mb-4" />` appears after the header, so on narrow widths you have a sticky header *and* a search bar in flow — likely overlap with the also-sticky `ProjectsToolbar` (`sticky top-16`). Worth verifying visually.
- `EditableProjectName`: pressing `Escape` resets value, but `ref.setSelectionRange(0, 0)` is called *after* `setIsEditing(false)`, which then `blur()`s; ordering is fine, but the implicit save in `onBlur` then triggers `saveEdit` — which re-reads `inputRef.current.value`. Since `defaultValue` was reset to the original, it should no-op, but this is fragile.
- `usePreviewSize` returns `width|height` undefined when `canvasSize` is missing; `PreviewCanvas` constructs `new CanvasRenderer({ width: undefined, height: undefined, ... })` when so. This relies on the renderer to validate — risky.
- The degraded renderer banner hardcodes the recommendation "open OpenCut in Chrome". Edge / Brave / Arc are also Chromium-based; the messaging excludes them.
- The export button passes `disabled={!hasProject}` to a native `<button>` with `cursor-not-allowed`, but then the parent `<Popover>` is still considered `open` if state says so — a stale `isExportPopoverOpen=true` could survive an active project being closed.

---

## 5. Technical risks

### 5.1 State management risks

- **`EditorCore` is a process-wide singleton.** `EditorCore.getInstance()` is called from `useEditor` and never reset on route changes. `EditorCore.reset()` exists but isn't wired into navigation. Switching between projects reuses the same managers; subtle bugs (e.g. a stale playback subscription, or a stale `lastSceneRef` in the renderer) will be hard to reproduce.
- **`useEditor` subscribes to every manager every time a selector is used.** `subscribeAll` registers callbacks on **nine managers** (playback, timeline, scenes, project, media, renderer, selection, clipboard, diagnostics) for every component that uses a selector. With dozens of components selecting, this is a lot of fan-in. Equality is shallow array-aware; many selectors that return objects will recompute frequently. Performance is real risk on large timelines.
- **Many Zustand stores are persisted** to `localStorage` (`projects-view-mode`, `assets-panel`, `panel-sizes`, `timeline-store`). The `panel-sizes` store has a hand-written `migrate(persistedState)` for v1→v2; future migrations need to keep adding similar logic. This is a quiet maintenance tax.
- **No global error boundary** observed in `app/layout.tsx`. A render exception inside the timeline will white-screen the editor.
- **`editor.command` reactor mutates tracks.** `core/index.ts` registers a reactor that prunes empty overlay/audio tracks after every command. This is a clever auto-clean, but it makes commands non-idempotent in a subtle way (a single command can produce multiple state changes). Anyone debugging undo/redo needs to know about this.

### 5.2 Timeline / editor risks

- `timeline/components/index.tsx` is dense: it owns wheel handling, scroll syncing, ruler/labels mirroring, drag drop, snapping, edge auto-scroll, selection box hit testing, and persistence — all in one file. Refactoring it carelessly will break invariants no one wrote down.
- **Custom non-passive wheel listener.** Done deliberately to suppress browser zoom; correct, but any change to scroll containers must keep that listener attached and ordering correct, otherwise users get unexpected page zoom.
- **Pixel ↔ time math is shared between `timeline/pixel-utils.ts`, `timeline/zoom-utils.ts`, `timeline/scale.ts`.** A drift here propagates into snap points, drag offsets, and resize handles. There are tests in `timeline/__tests__` (good) — keep them green.
- **Scenes** add another layer of tracks (`overlay`, `main`, `audio`) that the timeline flattens via `[...overlay, main, ...audio]`. Order matters; many other files depend on this ordering.
- **The renderer canvas is mounted into a `div` via direct DOM manipulation** inside a `useEffect`. Strict Mode + dev re-mounting could double-mount the canvas. Watch for canvas duplication or lifecycle issues during HMR.
- **`useDeepCompareEffect` rebuilds the render tree** on every track / media / canvas / background change. With many tracks or large media graphs, the deep compare itself becomes a hot path.

### 5.3 Performance risks

- The `useEditor((e) => …)` pattern re-runs on **every** subscription event from any of nine managers. If a typical interaction (e.g. dragging a clip) emits playback ticks + timeline updates + selection updates, every selector in the tree runs each tick.
- Many components repeatedly call `editor.media.getAssets()` / `editor.scenes.getActiveScene()` etc. without `useMemo`, leading to recomputation per render.
- `Image` from `next/image` with `unoptimized` on media previews bypasses Next image optimisation — fine for blob URLs but means thousands of large thumbnails will tax the browser if a user imports a big folder.
- No virtualization in the assets panel grid/list (`react-window` is in `package.json` but not used in the media list). A user importing a hundred clips will render a hundred draggable nodes.

### 5.4 Files to handle with care

These are load-bearing. Read first, change last:

| File                                                                  | Why                                              |
| --------------------------------------------------------------------- | ------------------------------------------------ |
| `apps/web/src/core/index.ts` and `core/managers/*`                    | Singleton + reactors + save bootstrap            |
| `apps/web/src/editor/use-editor.ts`                                   | Multi-manager subscription with shallow caching  |
| `apps/web/src/timeline/components/index.tsx`                          | Wheel + scroll + selection + drop orchestration  |
| `apps/web/src/timeline/components/timeline-track.tsx` / `timeline-element.tsx` | Element rendering hot path              |
| `apps/web/src/timeline/{pixel-utils,zoom-utils,scale}.ts`             | Pixel/time math used everywhere                  |
| `apps/web/src/timeline/snapping/*`, `update-pipeline.ts`              | Drag/snap pipeline                               |
| `apps/web/src/preview/components/index.tsx`                           | wgpu canvas mount + render loop                  |
| `apps/web/src/services/renderer/*`                                    | Render tree → wgpu                               |
| `apps/web/src/commands/*`                                             | Undo/redo                                        |
| `apps/web/src/services/storage/*`                                     | OPFS / IDB / migration logic                     |
| `apps/web/src/export/*` + `core/managers/project-manager` export path | Long-running, cancelable, easy to deadlock UI    |
| `apps/web/src/wasm/*` + the `opencut-wasm` package                    | Time math correctness                            |

If touched: keep `__tests__` green and re-test (a) drag a clip, (b) split, (c) export, (d) undo/redo, (e) reload editor with a saved project.

---

## 6. Redesign opportunities

### 6.1 Quick wins (one-line to one-file)

1. **Fix `"{n} elements selected.0"` typo** in `properties/index.tsx`.
2. **Either wire up Rename/Delete in the project dropdown or remove the unused dialogs.** If keeping, add a context menu / dropdown items consistent with the projects page.
3. **Default `Section` `defaultOpen={true}` for Format/Quality/Audio in `ExportPopover`,** or persist the last state. Saves three clicks per export.
4. **Stop closing the export popover from cancelling the export.** Move the cancel button to a confirm step; let the popover stay closed silently with an in-progress toast.
5. **Replace the hand-rolled `ExportButton` styling with `Button variant="default"` + a single accent token.** Cleaner, themable, smaller.
6. **Hide `transitions` and `adjustment` tabs** until they ship, or render them as "Roadmap →" links instead of `"… coming soon"` strings.
7. **Convert `TrackToggleIcon` into a real `<button>` with `aria-label`** and keyboard support.
8. **Add an `<EmptyState>` shared component** and use it in: timeline (drag here), preview (no clips yet), assets media (already has overlay), each "coming soon" tab, and projects search.
9. **Standardize on one icon library** (HugeIcons appears to be the chosen one). Replace lucide and `react-icons` usages incrementally; start with the export popover and onboarding.
10. **Replace the onboarding's beta-only copy with one screen of editor basics** ("Drop media here · Drag to timeline · Press Space to play · Press E to export") and a *Skip* button.
11. **Add a `Save indicator` to the editor header** — a small "Saved · 2s ago" / "Saving…" pill driven by the `SaveManager`.
12. **Remove the `block md:hidden` second `SearchBar` in `/projects`** if it duplicates the collapsed one (verify visually first).
13. **Soften the degraded renderer banner copy:** "Best on Chromium-based browsers (Chrome, Edge, Arc, Brave, Opera)."

### 6.2 Medium-effort improvements

1. **Inline rename in projects list view** with a subtle pencil affordance + double-click.
2. **Reusable command-style sort dropdown** so projects and media share one component (`<SortMenu options={…}>`), eliminating the two-idiom drift.
3. **Properly responsive editor at the tablet breakpoint:** stack panels (Assets ↔ Properties as tabs above the preview, timeline below) so iPad-class devices are usable.
4. **Replace `MobileGate` with a real "Mobile preview" mode** — read-only timeline and a "Open on desktop" CTA, instead of a hard wall.
5. **Bring scene switching into a header-level dropdown with thumbnails.** The current Sheet is heavy.
6. **Persistent in-editor help drawer** with: keyboard shortcuts, video tutorials, what's new. Replace the current Discord-only call to action.
7. **Toast-based export with a dock pill.** Once started, the export persists as a small pill at the bottom of the editor showing progress; clicking opens the popover. Lets users keep editing during long renders.
8. **Virtualize the media library** using `react-window` (already a dep).
9. **Rebuild the properties panel layout** with named tabs (icon + small label below) instead of icon-only — discoverability up, wasted vertical space down.
10. **A11y pass:** `aria-label` on every icon-only button, focus rings on every interactive surface, `prefers-reduced-motion` for the landing handlebars.
11. **Design tokens cleanup:** remove the `.panel` selector override in favour of an explicit `panel: { ... }` token namespace and apply via component variants. This makes the colour system predictable.
12. **Single source for keyboard shortcuts.** Replace the per-tooltip stringification with a small component that reads `useKeyboardShortcutsHelp` and renders consistent kbd badges.

### 6.3 Large redesign ideas

1. **Mode-aware editor:** switch between "Quick edit" (single track, big preview, three buttons: trim / split / export) and "Pro" (current layout). A clear toggle in the header. Lowers the floor for new users without removing power.
2. **Unified left rail with a persistent vertical "browser" navigation** (Project · Assets · Effects · Audio · Settings) instead of icon-only tabs hidden in a panel. Frees the assets panel to be larger and content-first.
3. **Tour-style first-run experience:** synthetic data — drop in a sample clip, highlight the import area, then the timeline, then export. Runs the first time the project is empty.
4. **Replace the ad-hoc panel resize state with a presets system** (Code · Edit · Audio · Color) and let resizable panels morph.
5. **Drop-in Inspector** instead of right-side tabs: contextual panel that hovers near the selected element with the few most-relevant properties, plus a "More…" button into the full panel. Less travel for the eye.
6. **Replace the Export popover with a full export modal** (with preset thumbnails, file size estimate, and a "render in background" option). Popover is the wrong primitive for a destination action.

### 6.4 Beginner-safe ranking

For someone new to this codebase, lowest-risk first:

1. Marketing pages (`landing/`, `header.tsx`, `footer.tsx`, `app/page.tsx`).
2. Editor chrome (`editor-header.tsx`, `onboarding.tsx`, `mobile-gate.tsx`, `export-button.tsx`).
3. Empty states and copy across panels.
4. shadcn `Button` variants, sort dropdowns, icon swap.
5. `app/projects/page.tsx` (responsive cleanup, rename inline).
6. Properties panel UI tweaks (tab labels, EmptyView reuse).
7. **Avoid initially:** anything in `timeline/`, `preview/`, `core/`, `services/renderer/`, `services/storage/`, `commands/`. They are load-bearing.

---

## 7. Recommended implementation roadmap

The phases are sequential. Each phase ends with the editor still working — no half-finished refactors leaked into main.

### Phase 1 — Safe UI polish (1–2 days, beginner friendly)

Goal: fix obvious bugs, normalize the surface, no flow changes.

- [ ] Fix `"elements selected.0"` typo in `properties/index.tsx`.
- [ ] Either wire Rename/Delete into `ProjectDropdown` or delete the unused dialogs from the file.
- [ ] Ship a shared `<EmptyState icon title description action>` component. Reuse in projects (already), properties (replace `EmptyView`), media drag overlay, timeline empty, preview empty.
- [ ] Hide or relabel `transitions` and `adjustment` tabs.
- [ ] Replace `TrackToggleIcon` with a `<Button variant="ghost" size="icon" aria-label=…>`.
- [ ] Standardize icon library on HugeIcons. Sweep `lucide-react` and `react-icons` usages; document the swap.
- [ ] Replace hardcoded gradient on `ExportButton` with `Button variant="default"` plus a single accent token.
- [ ] Add a `Saved · just now / Saving…` pill to the editor header driven by `editor.save`.
- [ ] Soften the degraded renderer banner copy.
- [ ] Remove the duplicate `<SearchBar>` mobile usage in `/projects` if visually duplicated.
- [ ] A11y first pass: `aria-label` on every icon-only button; visible focus rings; `prefers-reduced-motion` for landing handlebars.

Acceptance: visually consistent, no functional regressions, a11y lint clean on the editor route.

### Phase 2 — User flow improvements (3–5 days)

Goal: reduce clicks, fix dead-ends, improve first-run.

- [ ] Persist Format/Quality/Audio expansion + last-used values in the export popover.
- [ ] Move export to a dock pill: starts a render, pill shows progress at the bottom of the editor, dismiss only via Cancel-confirm.
- [ ] New onboarding: one screen of editor basics with Skip and "Don't show again". Move beta/Discord copy to a tertiary "About this beta" link.
- [ ] Inline rename on `/projects` list view; rename via double-click or pencil.
- [ ] Unified `<SortMenu>` shared by projects + media.
- [ ] Header-level Scenes dropdown (with thumbnails) replacing the Sheet for switching; keep the sheet for bulk edit only.
- [ ] Replace `MobileGate` hard wall with a "Mobile preview" mode: read-only player + "Open on desktop" CTA (keeps the current override path).
- [ ] Re-locate Rename / Delete / Project info in the editor's project dropdown.
- [ ] Add a sample project / template starter on `/projects` empty state.

Acceptance: a fresh user can import a clip, place it on the timeline, and export, in fewer than ~10 clicks total, with no dialog stacks blocking them.

### Phase 3 — Deeper editor redesign (1–3 weeks)

Goal: rethink layout and information density without rewriting the engine.

- [ ] Mode-aware editor: Quick / Pro toggle in the header, with two preset panel layouts and a curated quick-edit toolbar.
- [ ] Reorganize the left rail: project navigator + assets browser as siblings, freeing the assets panel.
- [ ] Refactor `timeline/components/index.tsx` into smaller files (wheel handling, scroll mirror, selection, drag drop) without changing observable behaviour. Tests must stay green.
- [ ] Properties panel as labelled tabs (icon + tiny caption), with a contextual "Most used" pinning.
- [ ] First-run tour: synthetic clip + highlighted areas, runs once when the project is empty.
- [ ] In-editor Help drawer (shortcuts, tutorials, what's new).
- [ ] Virtualize the media library (`react-window`).
- [ ] Tablet-class responsive layout.
- [ ] Token cleanup: remove `.panel` selector, switch to explicit token namespace + variants.

Acceptance: existing power users see no regressions; new users can ship a first clip without leaving the editor.

### Phase 4 — Optional advanced features (later)

Goal: bigger bets, riskier.

- [ ] Project templates (square / vertical / 16:9 / podcast) with prefilled tracks.
- [ ] Auto-captions surface improvement (`transcription/` already exists).
- [ ] Background-render queue with multiple concurrent exports.
- [ ] Plugin/effect marketplace UI (matches the Rust core's plugin-first direction).
- [ ] Cloud project sync UI.
- [ ] AI-assisted edits (cuts on silence, speaker focus, etc.).
- [ ] "Render preview at lower resolution" toggle for slow machines.
- [ ] Real per-user settings page (`/settings`) backed by `better-auth`.

These should wait until Phase 1–3 stabilize the foundations.

---

## Appendix A — Files referenced (for reviewers)

The audit is based on direct reading of:

- Top-level: `README.md`, `AGENTS.md`, `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/components.json`, `apps/web/.env.example`.
- App shell: `app/layout.tsx`, `app/page.tsx`, `app/base-page.tsx`, `app/projects/page.tsx`, `app/projects/store.ts`, `app/editor/[project_id]/page.tsx`.
- Editor chrome: `components/editor/editor-header.tsx`, `components/editor/onboarding.tsx`, `components/editor/mobile-gate.tsx`, `components/editor/scenes-view.tsx`, `components/editor/export-button.tsx`.
- Marketing chrome: `components/landing/hero.tsx`, `components/landing/handlebars.tsx`, `components/header.tsx`, `components/footer.tsx`.
- Panels: `components/editor/panels/assets/{index,tabbar,assets-panel-store,views/assets,views/base-panel}.tsx`, `components/editor/panels/properties/{index,empty-view,registry}.tsx`.
- Preview & timeline: `preview/components/{index,toolbar}.tsx`, `timeline/components/{index,timeline-toolbar}.tsx`.
- State & layout: `editor/{panel-store,use-editor,editor-store}.ts`, `panels/layout.ts`, `timeline/timeline-store.ts`.
- Media: `media/{use-paste-media,use-file-upload}.ts`.
- Core: `core/index.ts`, `actions/definitions.ts` (partial).
- Styling: `app/globals.css`, `components/ui/button.tsx`.

No code was modified during the audit.
