# AI Animation Pipeline — Build Plan

Refined for parallel execution by autonomous subagents. Each phase defines exact file paths, component APIs, and state contracts. Agents must not edit files outside their phase's **owned paths** list.

---

## Architectural ground rules (read first)

The current app keeps **all** state inside `src/App.jsx` via `useState`. That file would become a permanent merge-conflict hotspot if phases 1–7 all try to edit it in parallel. Phase 0 fixes this by lifting state into Zustand slices and converting `App.jsx` into a thin wirer.

**Rule 1 — Store-first.** Feature phases must add a new slice in `src/store/slices/<feature>Slice.js` and a new component/panel. They must **never** add new `useState` calls to `App.jsx`.

**Rule 2 — One slice per phase.** Each phase owns its own slice file. No two phases write to the same slice file.

**Rule 3 — App.jsx edits are additive and mechanical only.** After Phase 0, `App.jsx` only mounts components and reads selectors. A phase may add **one** import and **one** JSX element. Nothing else.

**Rule 4 — Types live in `src/types.js` (JSDoc typedefs).** When expanding shapes, add `@typedef` blocks; do not rename existing fields.

**Rule 5 — Phase 0 must land before anything else.** Phases 1–7 can then run concurrently.

---

## Target dependency tree after Phase 0

```
src/
  App.jsx                        # thin wirer; reads selectors, mounts panels
  main.jsx
  index.css
  types.js                       # JSDoc typedefs for Item, Scene, Shot, etc.
  store/
    index.js                     # combined zustand store
    slices/
      cameraSlice.js             # camera, tool, pan
      itemsSlice.js              # items, selection, groups, CRUD
      timelineSlice.js           # timelineIds, playback
      projectSlice.js            # project metadata, scenes, shots (Phase 1)
      generationSlice.js         # jobs, providers, queue (Phase 4)
      agentSlice.js              # Claude agent messages, tool calls (Phase 5)
      historySlice.js            # undo/redo (Phase 7)
  components/
    Navbar.jsx
    Toolbar.jsx
    CanvasItem.jsx               # extended by Phase 2
    HudPanel.jsx
    TimelinePanel.jsx            # replaced by Phase 6
    ZoomSlider.jsx
    ArrangeBar.jsx
    PipelineBar.jsx              # Phase 2
    InspectorPanel.jsx           # Phase 3
    AgentPanel.jsx               # Phase 5
    StatusPill.jsx               # Phase 2 shared
  providers/                     # Phase 4
    index.js                     # registry
    base.js                      # abstract adapter
    vidu.js
    wavespeed.js
    seedream.js
    fal.js
  services/                      # Phase 4+5
    generationQueue.js
    anthropicClient.js
  agents/                        # Phase 5
    tools/
      canvasTools.js
      generationTools.js
    prompts/
      systemPrompt.js
  hooks/
    useKeyboardShortcuts.js      # Phase 7
    usePersistence.js            # Phase 7
```

---

## Phase 0 — Foundation refactor (BLOCKS EVERYTHING)

**Owner:** single agent, runs first. Must complete and land before phases 1–7 are dispatched.

**Goal:** zero behavior change. Extract state from `App.jsx` into Zustand slices. No visible UI change.

**Owned paths (create/edit):**
- `package.json` — add `zustand`, `nanoid`
- `src/types.js` — new file
- `src/store/index.js` — new file
- `src/store/slices/cameraSlice.js` — new file
- `src/store/slices/itemsSlice.js` — new file
- `src/store/slices/timelineSlice.js` — new file
- `src/App.jsx` — full refactor
- `src/components/CanvasItem.jsx` — switch to store selectors for drag
- `src/components/HudPanel.jsx` — switch to store selectors
- `src/components/TimelinePanel.jsx` — switch to store selectors
- `src/components/ArrangeBar.jsx` — switch to store selectors
- `src/components/ZoomSlider.jsx`, `Toolbar.jsx`, `Navbar.jsx` — switch as needed

### Store contract (exact exported API)

```js
// src/store/index.js
import { create } from 'zustand'
import { cameraSlice } from './slices/cameraSlice'
import { itemsSlice } from './slices/itemsSlice'
import { timelineSlice } from './slices/timelineSlice'

export const useStore = create((set, get) => ({
  ...cameraSlice(set, get),
  ...itemsSlice(set, get),
  ...timelineSlice(set, get),
}))
```

### cameraSlice.js — exact shape

State: `camera: { x, y, zoom }`, `tool: 'select'|'pan'|'delete'`, `isPanning: boolean`
Actions: `setCamera(updater)`, `setTool(tool)`, `setIsPanning(bool)`, `zoomAt({ sx, sy, factor })`, `panBy(dx, dy)`

### itemsSlice.js — exact shape

State:
- `items: Item[]` — see `types.js`
- `selectedIds: Set<number>`
- `groups: Record<number, Set<number>>`
- `marquee: { x1, y1, x2, y2 } | null`

Actions (names are contractual; do not rename):
- `spawnItem(type, atCenter)` → returns new id
- `deleteSelected()`
- `updateItem(id, patch)` ← **required by Phases 1, 2, 3, 4**
- `setSelectedIds(ids)`
- `toggleSelected(id, shift)`
- `dragSelectedBy(dx, dy)`
- `groupSelected()` / `ungroupSelected()`
- `alignSelection(mode)` — mode: `'left'|'right'|'centerH'|'top'|'bottom'|'centerV'`
- `distributeSelection(axis)` — axis: `'h'|'v'`
- `gridLayoutSelection({ cols, gap, sort })`
- `setMarquee(rect)`

Selectors (exported as hooks):
- `useSelectedItems()` → Item[]
- `useExpandedSelection()` → Set<number>
- `useItemGroupMap()` → Record<number, number>
- `useItem(id)` → Item | undefined

### timelineSlice.js — exact shape

State: `timelineIds: number[]`, `timelineOpen: boolean`, `playback: { currentTime, playing }`
Actions: `addToTimeline(id)`, `removeFromTimeline(index)`, `reorderTimeline(from, to)`, `setTimelineOpen(bool)`, `setCurrentTime(t)`, `setPlaying(bool)`

### types.js

```js
/**
 * @typedef {Object} Item
 * @property {number} id
 * @property {'image'|'video'|'note'} type   // extended by Phase 1
 * @property {number} x @property {number} y @property {number} w @property {number} h
 * @property {string} name
 * @property {number} [duration]
 * @property {string|null} [src]
 * @property {string} [content]
 * // Phase 1 additions go here as optional fields:
 * @property {string} [status]
 * @property {string} [prompt]
 * @property {string} [model]
 * @property {number} [seed]
 * @property {string[]} [referenceIds]
 * @property {string} [sceneId]
 * @property {string} [shotId]
 */
```

### App.jsx after Phase 0 (shape agents must preserve)

Must be ≤120 lines. Structure:
1. Read camera, tool, items, selection from store via hooks.
2. Attach wheel/pointer/keyboard listeners that call store actions.
3. Render `<Navbar/> <Toolbar/> <HudPanel/> <TimelinePanel/> <ArrangeBar/> <ZoomSlider/>` and the transform group. Components read their own state from the store — **do not pass state as props**.

### Definition of done — Phase 0

- `npm run dev` shows identical behavior to current main.
- `grep -n "useState" src/App.jsx` prints nothing (or only for strictly local UI state like menu open/close, none of which affect other features).
- All existing features (spawn, drag, group, align, grid, timeline, marquee, pan, zoom, Ctrl+A, Ctrl+G) work unchanged.

---

## Phase 1 — Data model expansion (project, scenes, shots)

**Depends on:** Phase 0.
**Owned paths:**
- `src/store/slices/projectSlice.js` — new
- `src/types.js` — **append only** (new `@typedef` blocks; do not edit existing ones)
- `src/schemas/projectV1.js` — new, serialization helpers

**Slice contract:**

State:
- `project: { id, title, fps, resolution: { w, h }, createdAt }`
- `scenes: Record<string, Scene>` where `Scene = { id, title, order, shotIds: string[] }`
- `shots: Record<string, Shot>` where `Shot = { id, sceneId, title, order, itemIds: number[], beatNote }`

Actions: `createScene(partial)`, `updateScene(id, patch)`, `deleteScene(id)`, `createShot(sceneId, partial)`, `updateShot(id, patch)`, `assignItemToShot(itemId, shotId)`, `reorderScenes(ids)`, `reorderShots(sceneId, ids)`.

**Integration with itemsSlice:** Phase 1 does **not** edit `itemsSlice.js`. Items gain `sceneId`/`shotId` via `updateItem({ sceneId, shotId })` called from projectSlice actions.

**DoD:** A scene can be created, a shot added to it, and `assignItemToShot` tags existing canvas items. No UI required this phase.

---

## Phase 2 — Enhanced cards + PipelineBar

**Depends on:** Phase 0 (reads `types.js` optional status/model fields added in Phase 1 but gracefully degrades if missing).
**Owned paths:**
- `src/components/CanvasItem.jsx` — extend (single-file edit)
- `src/components/PipelineBar.jsx` — new
- `src/components/StatusPill.jsx` — new shared component
- `src/App.jsx` — **one** import + **one** `<PipelineBar />` JSX line

**StatusPill contract:**
```jsx
<StatusPill status="idle|queued|generating|ready|error" progress={0..1} />
```

**PipelineBar contract:** bottom-center bar showing active jobs count, current provider, "Generate selected" button. Reads `generationSlice` (Phase 4) when present; otherwise hides itself (null render if no jobs).
```jsx
<PipelineBar /> // self-contained, reads store directly
```

**CanvasItem extension:** add optional status pill overlay in top-right, thumbnail from `item.src || item.thumbUrl`, "variations" affordance on hover (calls `updateItem` with a request marker that Phase 4 reads).

**Conflict avoidance:** Phase 2 and Phase 6 both visually touch cards. Phase 2 owns `CanvasItem.jsx`; Phase 6 owns timeline files and must **not** open `CanvasItem.jsx`.

**DoD:** Card shows status pill based on `item.status`; PipelineBar renders with a static "Generate" button stub.

---

## Phase 3 — InspectorPanel (right-side)

**Depends on:** Phase 0.
**Owned paths:**
- `src/components/InspectorPanel.jsx` — new
- `src/App.jsx` — **one** import + **one** JSX line

**Activation:** when `useSelectedItems().length === 1`. Hidden otherwise.

**Layout:** absolute, right side, **above** the TimelinePanel z-index when both are open, OR TimelinePanel takes right side and Inspector floats as a card over canvas top-right. **Spec: Inspector is a floating card at `top: 56px; right: 16px; width: 320px`** — it does **not** share space with `TimelinePanel`. When Timeline is open, Inspector shifts left by `timelinePanel.width`. Phase 3 reads the timeline panel width from `timelineSlice` (Phase 0 exposes `timelinePanelWidth`, default 380, settable via `setTimelinePanelWidth`).

**Phase 0 must add `timelinePanelWidth` to the timeline slice** to enable this. (Clarifying contract edit — add to Phase 0 DoD.)

**Tabs:** Properties | Prompt | Generation | References. All tabs call `updateItem(id, patch)` only.

**DoD:** Selecting a single item shows inspector; editing name updates the card.

---

## Phase 4 — Multi-provider AI generation

**Depends on:** Phase 0. Lands independently of Phases 2/3 (both read its slice optionally).
**Owned paths:**
- `src/providers/index.js`, `base.js`, `vidu.js`, `wavespeed.js`, `seedream.js`, `fal.js` — all new
- `src/services/generationQueue.js` — new
- `src/store/slices/generationSlice.js` — new
- `src/App.jsx` — no edits (queue boots lazily on first job)

**Provider adapter interface (providers/base.js):**
```js
/**
 * @typedef {Object} GenerationRequest
 * @property {'image'|'video'} kind
 * @property {string} prompt
 * @property {string} [negativePrompt]
 * @property {string[]} [referenceUrls]
 * @property {number} [seed]
 * @property {Record<string, any>} [providerOptions]
 */
/**
 * @typedef {Object} GenerationResult
 * @property {string} url
 * @property {string} [thumbUrl]
 * @property {Record<string, any>} raw
 */
export class ProviderAdapter {
  id = 'base'
  label = 'Base'
  supports = { image: false, video: false }
  /** @returns {Promise<{ jobId: string }>} */
  async submit(req) { throw new Error('not implemented') }
  /** @returns {Promise<{ status: 'queued'|'running'|'done'|'error', progress?: number, result?: GenerationResult, error?: string }>} */
  async poll(jobId) { throw new Error('not implemented') }
  async cancel(jobId) {}
}
```

**Registry:** `providers/index.js` exports `PROVIDERS = { vidu, wavespeed, seedream, fal }` and `getProvider(id)`.

**generationSlice state:**
- `jobs: Record<string, Job>` where `Job = { id, itemId, providerId, status, progress, request, result?, error? }`
- `activeProviderId: string`
- `apiKeys: Record<string, string>` — read from `localStorage` at init; never logged

**Actions:** `enqueueJob({ itemId, providerId, request })`, `cancelJob(id)`, `setActiveProvider(id)`, `setApiKey(providerId, key)`.

**Queue service:** single interval ticker, polls providers, on `done` calls `updateItem(itemId, { src: result.url, thumbUrl: result.thumbUrl, status: 'ready' })`.

**Security:** API keys live in localStorage only. Never send them to anything except the provider's documented endpoint. No telemetry.

**DoD:** Submitting a mock request cycles a job through `queued → running → done` and updates the item `src`. Real provider implementations may use placeholder endpoints that must be clearly commented as `TODO: real endpoint`.

---

## Phase 5 — Claude agent panel

**Depends on:** Phase 0. Can run parallel with Phase 4 (reads its slice if present).
**Owned paths:**
- `src/components/AgentPanel.jsx` — new (left-side slide-out)
- `src/services/anthropicClient.js` — new
- `src/agents/tools/canvasTools.js` — new
- `src/agents/tools/generationTools.js` — new
- `src/agents/prompts/systemPrompt.js` — new
- `src/store/slices/agentSlice.js` — new
- `src/App.jsx` — **one** import + **one** JSX line

**Model:** default to `claude-sonnet-4-6`. Do **not** use legacy model IDs. Toggle to `claude-opus-4-6` for heavy planning.

**Tool schema pattern:** each tool is an object `{ name, description, input_schema, handler }` where `handler(input)` calls store actions. Example:
```js
export const createSceneTool = {
  name: 'create_scene',
  description: 'Create a new scene in the project',
  input_schema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
  handler: (input) => useStore.getState().createScene({ title: input.title }),
}
```

**anthropicClient.js:** thin wrapper around `@anthropic-ai/sdk`. Use prompt caching (`cache_control: { type: 'ephemeral' }`) on the system prompt + tool definitions to save tokens. Handle `stop_reason: 'tool_use'` in a loop until `end_turn`.

**Security:** API key from localStorage (user-entered via panel). Never committed. CORS: SDK supports browser use with `dangerouslyAllowBrowser: true` — document this tradeoff in the panel.

**DoD:** Typing "create a scene called Opening" results in a tool call that creates the scene in projectSlice.

---

## Phase 6 — Timeline upgrade

**Depends on:** Phase 0.
**Owned paths:**
- `src/components/TimelinePanel.jsx` — major rewrite
- `src/components/timeline/TimelineTrack.jsx` — new
- `src/components/timeline/TimelineClip.jsx` — new
- `src/components/timeline/TimelineRuler.jsx` — new
- `src/store/slices/timelineSlice.js` — **extend** (Phase 0 defined core; Phase 6 adds tracks)
- `src/App.jsx` — no edits (already mounts TimelinePanel)

**Conflict note:** Phase 6 is the ONLY phase allowed to expand `timelineSlice.js`. Phase 0 must leave a comment marker `// --- Phase 6 extends below ---` for the agent to append after.

**Slice extension:**
```js
tracks: [
  { id: 'video', kind: 'video', clips: Clip[] },
  { id: 'audio', kind: 'audio', clips: Clip[] },
  { id: 'text',  kind: 'text',  clips: Clip[] },
]
// Clip = { id, itemId, trackId, startTime, duration, in, out }
```

Actions: `addClip(trackId, itemId, startTime?)`, `moveClip(id, trackId, startTime)`, `trimClip(id, { in?, out? })`, `splitClip(id, atTime)`, `rippleDelete(id)`.

**Playback:** extracted into `useTimelinePlayback()` hook inside `src/hooks/useTimelinePlayback.js`.

**DoD:** Three tracks render; drag reorder works; clip trim handles work; playback plays across tracks.

---

## Phase 7 — Polish (undo/redo, persistence, shortcuts, perf)

**Depends on:** Phase 0. Lands last (reads all slices).
**Owned paths:**
- `src/store/slices/historySlice.js` — new
- `src/store/middleware/undoable.js` — new
- `src/hooks/useKeyboardShortcuts.js` — new (central)
- `src/hooks/usePersistence.js` — new
- `src/components/ShortcutsOverlay.jsx` — new
- `src/App.jsx` — **one** import line for shortcut hook

**Undo/redo:** middleware wraps specified actions. Record only value-changing actions (`updateItem`, `deleteSelected`, `addClip`, etc.). Ignore `setCamera`, `setMarquee`, `setSelectedIds`.

**Persistence:** `usePersistence()` snapshots `{ project, scenes, shots, items, timeline }` to localStorage on debounce 500ms. File export/import: JSON download/upload via Navbar buttons (already present as icons).

**Keyboard:** migrate scattered `useEffect(keydown)` calls from `Toolbar.jsx`, `App.jsx` into one central hook. Add Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z for undo/redo.

**DoD:** Ctrl+Z undoes item moves; reloading the page preserves project; Ctrl+/ opens shortcuts overlay.

---

## Parallel dispatch table

| Phase | Depends on | Touches App.jsx? | Touches shared slice? |
|-------|------------|------------------|------------------------|
| 0     | —          | Full rewrite     | Creates core slices    |
| 1     | 0          | No               | Own slice only         |
| 2     | 0          | +1 import, +1 JSX line | No               |
| 3     | 0          | +1 import, +1 JSX line | No               |
| 4     | 0          | No               | Own slice only         |
| 5     | 0          | +1 import, +1 JSX line | No               |
| 6     | 0          | No               | Extends timelineSlice (only phase allowed to) |
| 7     | 0          | +1 import line   | Own slice + middleware |

After Phase 0 lands, **phases 1, 2, 3, 4, 5, 6 can dispatch in parallel**. Phase 7 should land after 1–6 so undo/redo covers all actions.

## Merge-conflict-prevention checklist for every phase PR

- [ ] No new `useState` in `App.jsx`.
- [ ] Did not edit any file in another phase's "Owned paths".
- [ ] Added `@typedef` entries appended to end of `types.js` (no edits to existing ones).
- [ ] `npm run lint` passes.
- [ ] `npm run dev` shows the phase's feature working and no regressions to prior phases.
