# OpenCut — Redesign Plan

**Repository:** `opencut-custom` (personal fork — no upstream contributions)
**Companion to:** [`docs/UX_AUDIT.md`](./UX_AUDIT.md)
**Status:** Plan only. No application code is modified by this document.

This is the proposal layer between the audit (what is) and the implementation (what we build). Anything controversial below should be challenged before code is written.

---

## 1. Product goal

OpenCut today is a powerful but uninviting tool. The redesign goal is **to lower the floor without lowering the ceiling**:

1. **Make OpenCut easier for non‑technical users.** A first‑time visitor should be able to import a clip, trim it, and export it without reading docs.
2. **Make the first editing experience feel simple and guided.** The editor should feel like a friendly assistant on first run, not a control panel for an aircraft.
3. **Keep advanced features discoverable but not overwhelming.** Power features (keyframes, masks, ripple editing, the curve graph editor, scenes, etc.) stay — but behind a *Pro* mode or an explicit "More tools" surface, so they do not crowd the default view.

Non‑goals:

- Rebuilding the timeline engine, renderer, or storage layer. Those are load‑bearing (see `UX_AUDIT.md` §5.4).
- Removing capabilities. Every existing feature stays accessible.
- Designing a different product. This is the same OpenCut, with a clearer front door.

---

## 2. Target users

| Persona | Wants | Today's friction | Wins from this plan |
| --- | --- | --- | --- |
| **Beginner** ("Has never edited video") | Cut, trim, add text, export | Faces a 4‑pane editor, no guidance, terms like "ripple" and "graph editor" | First‑run *Quick mode*, coach card, simple Export modal |
| **Short‑form creator** (TikTok / Reels / Shorts) | Vertical export, fast turnaround, captions | Has to set canvas in Settings tab, no preset for 9:16, captions are buried | Export presets ("TikTok 1080×1920"), surfaced Captions, sample templates |
| **Ex‑CapCut user** | Familiar layout: media left, preview centre, timeline bottom, properties right | Layout is roughly correct, but tabs are icon‑only and panels feel cramped; no keyboard help | Labelled tabs, density polish, Help drawer with shortcuts |
| **Quick trimmer** ("just need to cut 2 minutes off this") | Open file → trim → export | 3 dialogs on first visit, then a blank editor | Drop‑a‑file home action, in‑editor "Trim & export" workflow |

These four people drive every UX trade‑off below. If a feature is great but only helps a fifth persona, it ships in Phase 4 or never.

---

## 3. New UX principles

These are the rules we will defend during reviews.

1. **One obvious next step at all times.** Empty state? Show the action. Mid‑edit? Highlight Save/Export. After export? Offer "Open file" and "Start another".
2. **Clear first‑run experience.** A single screen that teaches *Import → Drag → Export* and can be dismissed forever. No beta marketing on the critical path.
3. **Obvious import.** Always‑visible Import button + always‑on drop target + paste support. Dropping anywhere in the editor must work.
4. **Simple timeline controls by default.** Default toolbar shows Split, Delete, Snap, Zoom. Power tools (ripple, graph editor, audio link/unlink, freeze) live behind a "More" group.
5. **Clear export flow.** Export is a destination, not a popover. A modal with presets (YouTube, TikTok, Instagram, Custom), one primary CTA, and a non‑blocking progress dock so users can keep editing.
6. **Helpful empty states.** Every empty surface (timeline, preview, properties, projects, search, "coming soon" tabs) uses one shared `<EmptyState>` with icon + title + description + primary action.
7. **Consistent visual hierarchy.** One icon library (HugeIcons), one Button component, one set of design tokens, one density rule (40 px toolbar / 32 px control / 24 px icon button).
8. **Keyboard shortcuts visible but not overwhelming.** Each tool's tooltip shows its key (e.g. `Split  S`). A Help drawer (`?` key) lists everything in one place. No more ad‑hoc tooltip strings.
9. **Mobile is preview‑only.** Don't pretend the full editor works on a phone. Show a read‑only player + "Open on desktop" prompt.
10. **Don't punish misclicks.** Closing the export popover must not cancel the export. Closing the panel must not lose state. Undo must always work.

---

## 4. Proposed new layout

The macro layout stays close to today's (which already broadly mirrors CapCut). The improvements are about clarity, density, and the role each region plays.

```
+---------------------------------------------------------------------+
|  [Logo▾]  Project Title (autosave: Saved)        [Quick|Pro]  [Export ▸] |  ← Top bar
+---+-----------------------------------------------------------------+
| ▣ |                                                                 |
| ♪ |                                                                 |
| T |               Preview (centre stage)                            |
| ✦ |                                                                 |
| 🎬|                            ◷  ▶  ⏯  ⛶                            |
| ⚙ |                                                                 |
+---+-----------------------------------------------------------------+
|   |                            Inspector / Properties               |
| L |                                                                 |
| e |                                                                 |
| f |                                                                 |
| t |                                                                 |
+---+-----------------------------------------------------------------+
|   Timeline (sticky bottom; collapsible in Quick mode)               |
+---------------------------------------------------------------------+
```

### 4.1 Header / top bar

- **Left:** OpenCut logo (links to `/projects`), project title (inline edit, with proper accessible label), **autosave indicator** (`Saved · 2s ago` / `Saving…`).
- **Centre:** *Quick / Pro* mode toggle. Quick mode hides advanced toolbar groups and opens with sensible defaults.
- **Right:** Theme toggle, Help (`?`), Feedback, **primary Export button** (real `<Button>` with the new accent token, not the bespoke gradient). Rename / Delete / Project info / Shortcuts move into a *Project menu* that drops down from the title.

### 4.2 Left media library

- A vertical *icon rail* (32 px wide) of categories: **Media · Audio · Text · Stickers · Effects · Captions · Settings**. "Coming soon" categories (`transitions`, `adjustment`) are removed from the rail until they exist. Captions get promoted out of the long tail.
- The rail **picks** which library is shown in the panel beside it. The panel always has:
  - A clear category title.
  - A persistent **Import** action (for Media), search, sort.
  - A scrollable, virtualised list of items (`react-window` is already a dependency).
  - A drop‑zone overlay covering the whole panel during drag.
- This replaces today's text‑only horizontal tab bar that hides categories at small widths.

### 4.3 Centre preview

- Stays the focal point. Aspect ratio determined by the project canvas size.
- New **empty state**: when no clips exist, show a soft `<EmptyState>` overlay with a 1‑2‑3 coach card ("1. Add media · 2. Drop on the timeline · 3. Export").
- Toolbar (bottom of preview) keeps timecode, play/pause, zoom, fullscreen — same place CapCut users expect them. Add a small **Snap to fit** button next to the zoom select.

### 4.4 Bottom timeline

- The default *Quick* timeline has only: Split (`S`), Delete (`Del`), Snapping toggle, Zoom slider, and a `+` "More tools" group containing today's full toolbar.
- *Pro* mode shows everything inline as today.
- Empty‑state row: when no clips, the whole timeline area shows a dashed drop target ("Drag media here").
- Track labels keep mute/hide as **real buttons** with `aria-label`s.
- Scenes selector becomes a header dropdown with thumbnails (today it's a Sheet); the bulk‑edit Sheet stays for power users.

### 4.5 Right inspector

- Same content as today's Properties panel, but with **labelled** tabs (icon + small caption), not icon‑only.
- Replaces empty‑view bespoke layout with the shared `<EmptyState>`.
- Multi‑selection message fixes the `"selected.0"` typo and adds a *Select all of type* affordance.
- Context‑sensitive *Quick actions* row at the top of the inspector (Trim · Split · Duplicate · Delete) so common edits don't require timeline travel.

### 4.6 Export button placement

- Moves to the **top‑right of the header**, where every web app keeps "Save / Publish / Export". Already the area's strongest position.
- Clicking opens a **modal** (not popover) with presets, Custom, audio toggle, and a single primary "Export" CTA.
- Once started, a **dock pill** appears at the bottom‑right of the editor showing progress; the modal can be dismissed without cancelling. Cancellation requires a confirm.

---

## 5. Specific screen improvements

### 5.1 Home / start screen (`/`)

- Same hero copy ("The open source video editor"), but the CTA changes from *Try early beta* to **Start a project**.
- Below the hero, surface **three sample‑project cards** (vertical 9:16, square 1:1, landscape 16:9) that create a project with the right canvas size pre‑filled. (Phase 4 makes these real templates with placeholder clips; Phase 1 just sets canvas + name.)
- The decorative `Handlebars` animation respects `prefers-reduced-motion` and is skipped on touch devices.
- Cleaner hierarchy: a single primary action, one secondary action ("View on GitHub"), no cluttered footer above the fold.

### 5.2 `/projects`

- Empty state: "No projects yet" + **two** primary actions: *New project* and *Start from a template*.
- Sticky‑header overlap fix: collapse the second toolbar row when the first is sticky on small viewports. Remove the duplicate `<SearchBar className="block md:hidden">` (audit §4.5).
- Inline rename in list view (double‑click or pencil affordance).
- One shared `<SortMenu>` matching the media panel.
- Each project card shows: thumbnail, name, last‑edited timestamp, duration, and a single overflow menu.

### 5.3 Editor empty state (no clips)

- Soft full‑editor coach: dim the timeline + inspector, brighten the assets panel and preview overlay, anchor a single coach card to the assets *Import* button.
- Coach text: **"Add media to get started — drop a file, paste, or click Import."** Dismiss on first import or with a small × in the top‑right.
- `localStorage["editor-coach-dismissed"]` tracks dismissal per device.

### 5.4 Media import state

- The Import button never disappears — it lives in the assets panel header at all times, regardless of how many items already exist.
- On drag‑over the editor (anywhere, not just the panel): show a full‑editor drop overlay with a single message ("Drop to import").
- Per‑file progress shown in a single stacking toast (already in `showMediaUploadToast`); collapse to a one‑line summary when more than three files are processing.
- Errors get `<EmptyState variant="error">` inside the toast with a Retry action.

### 5.5 Timeline editing state (one or more clips)

- Default density: 40 px toolbar, 8 px gap between groups, 1 px separators.
- Quick mode toolbar = `[Split] [Delete] | [Snap] [Zoom −  slider  +] | [More ▾]`.
- Pro mode toolbar = today's full set.
- Selection state: a small floating **Quick actions bar** appears above the selected clip (Trim · Split · Duplicate · Delete · Speed). This mirrors CapCut and reduces inspector travel.
- Snapping indicator gets a clearer visual (currently a thin line; we'll add a pulse).

### 5.6 Export modal

Replaces today's popover.

- **Presets row** (cards, big icons): YouTube 1080p · TikTok 1080×1920 · Instagram 1:1 · Twitter/X · Custom.
- Selecting a preset fills format, quality, and target dimensions. Selecting *Custom* expands an inline form (the audit's three sections — Format / Quality / Audio — but **all open by default**).
- One **Export** primary button. *Save defaults* checkbox (persists last‑used).
- Estimated file size + duration shown before export.
- During export: progress, ETA, Cancel (with confirm). The modal stays open by default but **can be dismissed without cancelling** — a `<ExportDock>` pill appears at the bottom right with the same controls.
- On success: download starts automatically + a sticky toast with *Open file* and *Start another* actions.

### 5.7 Error / loading states

- One shared `<ErrorState>` (icon, title, message, *Copy details*, *Retry*, optional *Report*). Used by export, render init, storage failures, and migration.
- One shared `<LoadingState>` (skeleton + label) and one `<Spinner>` (existing). Skeletons match the surface they replace; stop using ad‑hoc `<div className="animate-pulse">`.
- Degraded renderer banner: copy softened to **"Best on Chromium‑based browsers (Chrome, Edge, Arc, Brave, Opera)."** Banner persists‑dismissed per device.

---

## 6. Component‑level implementation list

Concrete, file‑level. None of these is implemented in this plan — this is the build sheet for Phase 1–3.

### 6.1 New components

| Component | Path | Purpose |
| --- | --- | --- |
| `<EmptyState>` | `components/ui/empty-state.tsx` | Shared icon/title/description/action. Variants: `default`, `error`, `loading`. |
| `<ErrorState>` | `components/ui/error-state.tsx` | Wraps EmptyState with Copy/Retry/Report. |
| `<SaveIndicator>` | `components/editor/save-indicator.tsx` | Subscribes to `editor.save`; renders `Saved · Xs ago` / `Saving…` / `Offline`. |
| `<ModeToggle>` (Quick/Pro) | `components/editor/mode-toggle.tsx` | Two‑state segmented control. Persists in a new `editor-mode` Zustand slice. |
| `<SortMenu>` | `components/ui/sort-menu.tsx` | One sort idiom (radio rows + asc/desc switch). Replaces both the projects and media implementations. |
| `<HelpDrawer>` | `components/editor/help-drawer.tsx` | Right‑side sheet: shortcuts, "what's new", links. Trigger from header `?` button. |
| `<CoachCard>` | `components/editor/coach-card.tsx` | Lightweight coach with Title / Body / Dismiss; placement via `anchor` prop. |
| `<ExportModal>` | `components/editor/export-modal.tsx` | Replaces the popover. |
| `<ExportPreset>` | `components/editor/export-preset.tsx` | Card cell for the presets row. |
| `<ExportDock>` | `components/editor/export-dock.tsx` | Bottom‑right progress pill + cancel. |
| `<ImportButton>` | `components/editor/import-button.tsx` | Lifted out of `MediaActions` so it can also live in the empty state and the editor coach. |
| `<QuickActionsBar>` | `timeline/components/quick-actions-bar.tsx` | Floating selection toolbar above clips. |
| `<TemplateCard>` | `components/landing/template-card.tsx` | Sample‑project entry on home + projects empty. |
| `<MobilePreview>` | `components/editor/mobile-preview.tsx` | Replaces `MobileGate`'s hard wall (Phase 2). |

### 6.2 Existing components to refactor

| Component | Path | Change |
| --- | --- | --- |
| `EditorHeader` | `components/editor/editor-header.tsx` | New layout (logo · project menu · autosave · mode toggle · help · theme · feedback · Export). Wire the orphan Rename/Delete dialogs into the new project menu. |
| `EditableProjectName` | same file | Add `aria-label`, replace `style={{ fieldSizing: "content" }}` with a measured width fallback for non‑Chromium browsers. |
| `ExportButton` | `components/editor/export-button.tsx` | Re‑skin with `Button variant="default"` and a single accent token. The popover content moves to `<ExportModal>`. The cancel‑on‑close behaviour is removed. |
| `Onboarding` | `components/editor/onboarding.tsx` | Replace 3‑step beta carousel with **one** Quick‑Start screen ("Add media · Drag · Export") + Skip + "About this beta" link. Fix the `DialogTitle` `sr-only` quirk. |
| `MobileGate` | `components/editor/mobile-gate.tsx` | Phase 1: keep wall but soften copy. Phase 2: convert to `<MobilePreview>` (read‑only player + Open on desktop CTA). |
| `PropertiesPanel` | `components/editor/panels/properties/index.tsx` | Fix the `"selected.0"` typo. Add labelled tabs. Use shared `<EmptyState>`. Add the Quick actions row. |
| `EmptyView` | `components/editor/panels/properties/empty-view.tsx` | Delete; use shared `<EmptyState>`. |
| `AssetsPanel` | `components/editor/panels/assets/index.tsx` | Replace top horizontal tab bar with the new vertical rail. Always render Import. Use shared empty/error states. |
| `TabBar` | `components/editor/panels/assets/tabbar.tsx` | Remove the "coming soon" entries; add Captions to the rail. |
| `TimelineToolbar` | `timeline/components/timeline-toolbar.tsx` | Implement Quick / Pro split. Power tools move under a `<DropdownMenu>` "More tools" group. |
| `TrackLabels` (and `TrackToggleIcon`) | `timeline/components/index.tsx` (and helpers) | Convert the bare icon click‑targets into real `<Button variant="ghost" size="icon">` with `aria-label`. |
| `DegradedRendererBanner` | `app/editor/[project_id]/page.tsx` | Copy softened; dismissal persisted; styled with the standard `Alert` token. |
| `Hero` | `components/landing/hero.tsx` | CTA → "Start a project". Add three template cards under the fold. `prefers-reduced-motion` respected. |
| `app/projects/page.tsx` | same | Inline rename, dedupe mobile SearchBar, replace ad‑hoc sort with `<SortMenu>`, empty state uses templates. |

### 6.3 Files **not** to change in this plan

(Direct quote from the audit's "files to handle with care" §5.4 — all timeline math, renderer, storage, commands, wasm, snapping, update pipeline. The redesign is a UI surface; the engine stays.)

### 6.4 Styling / design tokens

We add tokens; we do not rip out the existing system.

| Token | Notes |
| --- | --- |
| `--accent` / `--accent-foreground` | Replaces the hardcoded `#38BDF8 / #2567EC / #37B6F7` gradient on the Export button. Pulled from the existing `--primary` family but overridable. |
| `--surface-1` / `--surface-2` / `--surface-3` | Three explicit surface levels for header / panel body / nested cards. Removes the implicit "is this inside `.panel`?" question. |
| `--ring-focus` | One unified focus ring. Replaces the multiple ad‑hoc focus styles. |
| `density.toolbar`, `density.control`, `density.icon` | CSS variables fed by the Quick/Pro toggle. Quick mode uses 40 px toolbar / 32 px control / 24 px icon; Pro keeps today's denser values. |
| `radius.card` / `radius.control` | Two radii only. Today there is a mix of `rounded-sm`, `rounded-md`, `rounded-lg`. |

We do **not** delete the `.panel` selector in Phase 1–3 (audit §4.7). It moves to a `data-panel` attribute‑driven set of overrides in Phase 3 once the surface tokens are in place.

### 6.5 New stores / persistence

| Slice | Where | Persists |
| --- | --- | --- |
| `editor-mode` | `editor/mode-store.ts` | `quick` or `pro` (default `quick` for new users, `pro` if existing user was in Pro). |
| `coach-state` | `editor/coach-store.ts` | Per‑coach dismissal (`first-import`, `first-export`, `keyboard-help`). |
| `export-defaults` | extends `export/store.ts` (new) | Last preset, last format, last quality, last audio toggle. |

All Zustand, all `persist` middleware, all `localStorage`. No DB schema change.

---

## 7. Beginner‑safe implementation phases

The constraint is: **after every phase the editor still works**, no half‑finished refactor leaks into `main`, and each phase is a small, mergeable PR.

### Phase 1 — Visible polish (1–2 days, single PR)

Goal: fix the audit's smallest, highest‑confidence problems without changing flows. No new modes, no new modals.

1. **Fix the `"elements selected.0"` typo** (`properties/index.tsx`).
2. **Wire Rename/Delete in the project dropdown.** The dialogs are already mounted; just add the menu items.
3. Ship `<EmptyState>` and `<ErrorState>` and migrate `EmptyView`, projects search empty, "coming soon" tabs, and the export error block to use them.
4. **Hide `transitions` and `adjustment` tabs** until they ship.
5. Make `TrackToggleIcon` a real `<Button variant="ghost" size="icon">` with `aria-label`.
6. **Replace the `ExportButton` gradient** with `Button variant="default"` + `--accent` token. (Visual only — popover behaviour unchanged in Phase 1.)
7. **Add `<SaveIndicator>` to the editor header.**
8. **Soften the degraded renderer banner copy** ("Best on Chromium‑based browsers …").
9. Dedupe the mobile `<SearchBar>` in `/projects`.
10. **A11y first pass**: `aria-label` on every icon‑only button in the editor toolbar/header; visible focus rings; `prefers-reduced-motion` for the landing handlebars.

Acceptance: visually consistent, no flow change, lint + tests still green, manual smoke test (drag clip → split → export → undo → reload) passes.

Commit shape: 5–8 small commits, all in one PR named `polish: Phase 1 — UI normalization`.

### Phase 2 — Flow improvements (3–5 days, 2–3 PRs)

Goal: reduce clicks, fix the export pitfalls, replace the beta‑only onboarding.

1. **`<ExportModal>` + `<ExportDock>` + presets.** Closing the modal no longer cancels the export; cancellation is a confirm. Defaults persist.
2. **New onboarding**: one `Quick-Start` screen with Skip and "Don't show again". Move Discord/beta copy to a tertiary "About this beta" link.
3. **Inline rename on `/projects` list view.**
4. **Unified `<SortMenu>`** shared by projects and media.
5. **`<MobilePreview>`** replaces the hard wall (keeps the override path for desktop‑class touch devices).
6. **Project menu** in the editor header (Rename / Delete / Project info / Shortcuts / Help).
7. **Sample‑project starters** on the projects empty state and home (just creates a project with the right canvas size — real templates come in Phase 4).

Acceptance: a fresh user can import → drop → trim → export in under ten clicks, no dialog stack, no popover‑close trap. Lighthouse a11y on `/editor/<id>` ≥ today's baseline.

Commit shape: PR1 = Export modal + dock; PR2 = Onboarding + project menu; PR3 = Sort/rename/mobile preview. Easy to revert any one.

### Phase 3 — Editor redesign (1–2 weeks, multiple PRs)

Goal: apply the new layout without rewriting the engine.

1. **Quick / Pro `<ModeToggle>`** in the header. New Zustand slice. Default Quick for first‑time users.
2. **Left rail** (`Media · Audio · Text · Stickers · Effects · Captions · Settings`) replaces the horizontal tab bar.
3. **Quick‑mode timeline toolbar** (Split / Delete / Snap / Zoom / More). Pro mode = today's toolbar. Both behind the same component.
4. **Labelled property tabs** (icon + caption).
5. **`<HelpDrawer>`** (`?` to open). Reads from the existing `useKeyboardShortcutsHelp` registry; consolidates the per‑tooltip kbd badges.
6. **Virtualise the media library** with `react-window`.
7. **Floating `<QuickActionsBar>` above selected clips.**
8. **Tablet (1024 ≤ w < 1280) layout**: left rail collapses to icons only, inspector becomes a Sheet on tap. Phone stays preview‑only.
9. **Token cleanup**: introduce `--accent`, `--surface-{1,2,3}`, `--ring-focus`, density vars. The `.panel` selector becomes `data-panel`‑driven without behaviour change.

Acceptance: power users see no regressions in Pro mode; Quick mode's import → trim → export path is < 7 clicks for a one‑clip cut. Existing tests under `timeline/__tests__/` stay green; **no edits** in `timeline/{pixel-utils,zoom-utils,scale}.ts`, `services/renderer/*`, `services/storage/*`, `commands/*`, or `wasm/*`.

Commit shape: each numbered item is its own PR. Phase 3 lands incrementally over 1–2 weeks.

### Phase 4 — Optional (later, no order)

- Real project templates (square / vertical / 16:9 / podcast) with prefilled tracks.
- Background‑render queue with multiple concurrent exports.
- Plugin / effect marketplace UI (matches the Rust core's plugin direction in `AGENTS.md`).
- Real per‑user `/settings` page backed by `better-auth`.
- AI‑assisted edits (cuts on silence, speaker focus). Reuses `services/transcription/*`.
- "Render preview at lower resolution" toggle for slow machines.
- Cloud project sync UI.

These wait until Phase 1–3 stabilise the foundations.

---

## Appendix — Working agreement for the redesign

- **Branch per phase, PR per item.** Smaller is better. PRs over ~400 changed lines get split.
- **No engine touches without an issue first.** Anything in `core/`, `timeline/`, `preview/`, `services/`, `commands/`, `wasm/` requires a written ticket and a regression checklist.
- **Manual smoke test before merge.** Drag clip → split → drag onto overlay track → export → undo → reload. Five minutes. Every PR.
- **Tests stay green.** `timeline/__tests__/` is the canary.
- **Persist nothing the user hasn't seen.** New Zustand slices use clear keys (`editor-mode`, `coach-state`, `export-defaults`) and version with a `migrate` function from day one.
- **No dependencies added without a reason in the PR.** We are not introducing a new icon library, a new state lib, or a new design system package. Everything below is built from what is already in `package.json`.
- **Keep it personal‑fork‑only.** PRs target this fork's `main`. We never push to or PR against the upstream OpenCut repo.
