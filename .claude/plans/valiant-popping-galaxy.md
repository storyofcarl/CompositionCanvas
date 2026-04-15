# FrameForge — AI Animation Pipeline Hub

## Context

The app currently has an infinite canvas with basic tiles (image/video/note), a floating HUD, a timeline panel, and arrangement tools. It needs to evolve into a full animation pipeline hub — from script breakdown through final delivery — with AI generation integration (Vidu, WaveSpeed, SeDream/BytePlus, fal.ai), a Claude agent panel, rich card types, and a properties inspector.

This plan is structured as **7 phases** that can be executed by subagents working on isolated file sets. Each phase has clear inputs, outputs, and files touched.

---

## Phase 1 — Data Model & Card System

**Goal:** Replace the flat `{ id, type, x, y, w, h, name, duration, src, content }` item model with a rich card system that supports pipeline stages, generation params, status tracking, relationships, and version history.

**Files to create:**
- `src/data/cardDefaults.js` — factory functions for each card type with sensible defaults
- `src/data/constants.js` — enums: `PIPELINE_STAGES`, `CARD_STATUSES`, `CARD_TYPES`, `AI_PROVIDERS`, `ASPECT_RATIOS`

**Files to modify:**
- `src/App.jsx` — update `spawnItem` to use new card factories, add `updateCard(id, patch)` callback, expand spawn types beyond image/video/note

**Card base shape:**
```js
{
  id, type, x, y, w, h, name,
  stage: 'script-breakdown' | 'asset-creation' | 'storyboard' | 'production' | 'animatic' | 'scene-generation' | 'cleanup' | 'delivery',
  status: 'draft' | 'queued' | 'generating' | 'generated' | 'approved' | 'rejected' | 'in-timeline' | 'archived',
  createdAt, updatedAt,
  // Generation
  prompt: '', negativePrompt: '', provider: null, model: null, aspectRatio: '16:9', style: null, seed: null,
  generation: null,        // provider-specific params object
  providerJobId: null,
  // Media
  src: null, thumbnailSrc: null, duration: 0,
  // Relationships
  relations: [],           // [{ targetId, type: 'parent'|'reference'|'derived'|'sequence', meta }]
  versions: [],            // [{ versionId, createdAt, src, params, status, note }]
  tags: [],
  locked: false,
}
```

**Card types:** `script`, `scene`, `shot`, `character-design`, `background`, `concept-art`, `storyboard-frame`, `production-frame`, `video-clip`, `audio-clip`, `note`

Each type adds specific fields (e.g., `scene` has `sceneNumber, heading, synopsis, characters`; `shot` has `shotCode, shotType, cameraMove`; `video-clip` has `fps, resolution, hasAudio`).

**Key constraint:** All existing canvas logic (drag, select, align, group, grid) operates on `{ x, y, w, h }` which stays at the top level. No breaking changes to those systems.

---

## Phase 2 — Enhanced Canvas Cards & Pipeline Bar

**Goal:** Update CanvasItem rendering to reflect the new card model (stage colors, status badges, richer type visuals) and add a pipeline stage filter bar.

**Files to create:**
- `src/components/PipelineBar.jsx` — horizontal filter bar below toolbar. Stage pills: Script | Assets | Storyboard | Production | Animation | Post | Final | All. Active stage filters canvas items (non-matching items get `opacity-20 pointer-events-none`). Count badges per stage.
- `src/components/CardActionBar.jsx` — floating bar anchored below a selected card (inside transform group). Buttons: Generate, Regenerate, Upscale, Edit, Variation, History. Only shows for single-select. Hides during drag and below zoom 0.3.

**Files to modify:**
- `src/components/CanvasItem.jsx` — add stage color strip (left edge), status indicator dot (top-left: gray=draft, yellow=generating, green=generated, blue=approved), render card type icon from expanded set, show prompt preview on hover, accept `filteredOut` prop for dimming
- `src/App.jsx` — add `activeStage` state, pass filter to items, render PipelineBar and CardActionBar
- `src/components/HudPanel.jsx` — expand Toolkit spawn grid with new card types (script, scene, shot, storyboard-frame, etc.), add stage filter to inventory

**Stage colors:**
- script-breakdown: cyan
- asset-creation: indigo  
- storyboard: amber
- production: purple
- animatic: pink
- scene-generation: emerald
- cleanup: orange
- delivery: sky

---

## Phase 3 — Inspector Panel (Left Rail)

**Goal:** Build a properties panel that opens when a single card is selected, allowing full editing of all card fields.

**Files to create:**
- `src/components/InspectorPanel.jsx` — left-side panel, `top-11 left-0 bottom-0`, resizable (280–40vw, default 320px). Toggle button at `top-14 left-4` when closed. Opens on single-select, closes on deselect or multi-select.
- `src/components/inspector/PromptEditor.jsx` — multi-line textarea with character count, negative prompt toggle
- `src/components/inspector/GenerationSettings.jsx` — provider dropdown, model dropdown (filtered by provider), aspect ratio, style, duration, resolution
- `src/components/inspector/RelationsSection.jsx` — shows parent/child/reference links as clickable chips, "Link to..." button
- `src/components/inspector/VersionHistory.jsx` — list of past generations with thumbnails, restore button

**Files to modify:**
- `src/App.jsx` — add `inspectorOpen` state, `updateCard(id, patch)` if not done in Phase 1, pass to InspectorPanel
- `src/components/HudPanel.jsx` — auto-offset when inspector opens (or just float above at z-40, inspector at z-30)

**Sections (top to bottom, scrollable):**
1. Header: editable name, type badge, stage badge, lock toggle, close button
2. Thumbnail preview (click to focus on canvas)
3. Prompt + negative prompt (for generative cards)
4. Generation settings (provider, model, aspect ratio, style, duration)
5. Type-specific fields (scene: heading/synopsis/characters, shot: shotCode/shotType/cameraMove, etc.)
6. Relations (parent, children, references)
7. Version history
8. Tags editor
9. Sticky footer: Generate button (emerald), Add to Timeline button

---

## Phase 4 — Provider System & Generation Queue

**Goal:** Build the multi-provider abstraction layer, job manager, and a generation queue UI.

**Files to create:**
- `src/providers/constants.js` — provider capability descriptors (models, aspect ratios, duration ranges, extra fields per provider)
- `src/providers/registry.js` — provider map, `getProvider(id)`, `getProvidersForCapability(cap)`, `getAllProviders()`
- `src/providers/jobManager.js` — singleton: `submit(request, cardId)`, `checkStatus()`, polling loop (5s interval), subscribe/notify pattern
- `src/providers/useJobs.js` — React hook bridging jobManager to useState
- `src/providers/vidu.js` — Vidu provider: maps JobRequest → API call, handles polling
- `src/providers/wavespeed.js` — WaveSpeed provider
- `src/providers/sedream.js` — SeDream/BytePlus provider (stub, fill when API details known)
- `src/providers/fal.js` — fal.ai provider (uses @fal-ai/client or direct REST)
- `src/components/GenerationQueue.jsx` — bottom-right floating pill. Collapsed: "N generating..." with spinner. Expanded: job list with progress bars, cancel, retry. Fades completed jobs after 5s.

**Files to modify:**
- `vite.config.js` — add dev server proxy entries for each API (keeps keys server-side)
- `src/App.jsx` — integrate `useJobs` hook, on job completion patch `src` into the card, wire Generate buttons to `submit()`
- `src/components/inspector/GenerationSettings.jsx` — populate dropdowns from provider registry capabilities
- `src/components/CardActionBar.jsx` — wire Generate/Regenerate/Upscale to job submission

**Job lifecycle:**
```
User clicks Generate → jobManager.submit(request, cardId)
  → card.status = 'queued'
  → provider.submitJob(request) → providerJobId
  → card.status = 'generating', poll every 5s
  → provider.checkStatus(providerJobId)
  → on complete: card.src = result.url, card.status = 'generated', push to versions[]
  → on fail: card.status = 'draft', show error in queue
```

---

## Phase 5 — Right Panel Refactor + Agent Panel

**Goal:** Convert the right rail into a tabbed container holding Timeline + Agent, and build the Claude agent chat interface.

**Files to create:**
- `src/components/RightPanel.jsx` — tabbed wrapper (`top-11 right-0 bottom-0`). Two tabs: Timeline, Agent. Manages shared width/resize. Toggle button when closed.
- `src/components/agent/AgentPanel.jsx` — main panel: context bar, chat thread, input area
- `src/components/agent/ChatMessage.jsx` — message bubble (user = right/indigo, agent = left/neutral-800)
- `src/components/agent/ActionProposal.jsx` — special message card with title, description, preview of proposed changes, Approve (emerald) / Reject (neutral) buttons
- `src/components/agent/QuickActions.jsx` — chip buttons above input: "Break down script", "Suggest shots", "Generate prompts", "Analyze pacing"

**Files to modify:**
- `src/components/TimelinePanel.jsx` — refactor to be a child of RightPanel (remove its own positioning/toggle logic, receive width as prop)
- `src/App.jsx` — replace `timelineOpen` with `rightPanelOpen` + `rightPanelTab`, pass canvas state summary to AgentPanel

**Agent architecture:**
- Chat messages stored as `[{ id, role: 'user'|'assistant', content, timestamp, proposal? }]`
- Agent reads canvas context: selected cards, card count by stage/type, timeline summary
- Action proposals: `{ type: 'create_cards'|'modify_cards'|'reorder_timeline', items: [...], status: 'pending'|'approved'|'rejected'|'applied' }`
- On approve: proposal items get applied to canvas state (create cards, modify fields, etc.)
- Claude API integration via Anthropic SDK (streaming responses)
- System prompt includes: project context, available card types, pipeline stages, canvas item summary

---

## Phase 6 — Timeline Upgrade

**Goal:** Evolve the timeline from a flat ID array to multi-track with trim, transitions, and proper NLE behavior.

**Files to modify:**
- `src/components/TimelinePanel.jsx` — major rewrite:
  - Multi-track state: `tracks: [{ id, type: 'video'|'audio'|'text', label, clips: [...], muted, locked }]`
  - Clips: `{ cardId, trackId, startTime, duration, trimIn, trimOut, transition }`
  - Visual: horizontal track lanes with draggable clip blocks (not just a list)
  - Scrub bar: clip-aware with zoom control
  - Track headers: mute/lock/add buttons
  - Clip context menu: trim, split, transition type
- `src/App.jsx` — replace `timelineIds` with `timelineTracks` state, update `addToTimeline` to target a specific track

**Migration:** Convert existing `timelineIds: [1, 2, 3]` to `tracks: [{ id: 'video-main', type: 'video', clips: [{ cardId: 1, startTime: 0, duration: 3, trimIn: 0, trimOut: 0 }, ...] }]`

---

## Phase 7 — Polish & Integration

**Goal:** Wire everything together, add undo/redo, persistence, and polish.

**Files to create:**
- `src/hooks/useHistory.js` — undo/redo stack for card state (stores diffs or snapshots, Ctrl+Z / Ctrl+Shift+Z)
- `src/hooks/useAutoSave.js` — debounced localStorage persistence of project state
- `src/data/sampleProject.js` — a demo project with pre-populated cards across pipeline stages

**Files to modify:**
- `src/components/Navbar.jsx` — wire File menu (New/Save/Load/Export), Undo/Redo buttons to actual handlers
- `src/App.jsx` — integrate useHistory, useAutoSave, load from localStorage on mount
- All components — final pass for consistent spacing, hover states, keyboard accessibility

---

## Execution Strategy

Each phase is designed so 1–2 subagents can execute it in parallel:
- **Phase 1** can have one agent on `cardDefaults.js + constants.js` and another on `App.jsx` updates
- **Phase 2** can have one agent on `CanvasItem + PipelineBar + CardActionBar` and another on `HudPanel`
- **Phase 3** is primarily one agent (InspectorPanel + sub-components)
- **Phase 4** splits naturally: one agent on `providers/*` system, another on `GenerationQueue.jsx` + UI wiring
- **Phase 5** splits: one agent on `RightPanel + TimelinePanel refactor`, another on `agent/*` components
- **Phase 6** is one focused agent on TimelinePanel rewrite
- **Phase 7** is one agent for hooks + persistence, one for Navbar + polish

---

## Verification

After each phase, run:
```bash
cd "D:/canvas app" && npm run build
```

After all phases:
1. `npm run dev` — verify the app loads without errors
2. Spawn cards of each type from the expanded Toolkit
3. Filter by pipeline stage using the PipelineBar
4. Select a card → verify Inspector opens with all fields editable
5. Change provider/model in Inspector → verify generation settings update
6. Click Generate → verify job appears in GenerationQueue, card status updates
7. Open Agent tab → send a message → verify response renders
8. Add cards to timeline → verify multi-track display
9. Ctrl+Z → verify undo works
10. Refresh page → verify state persists from localStorage
