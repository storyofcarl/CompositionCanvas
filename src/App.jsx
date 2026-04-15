import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Navbar from './components/Navbar'
import Toolbar from './components/Toolbar'
import CanvasItem from './components/CanvasItem'
import HudPanel from './components/HudPanel'
import TimelinePanel from './components/TimelinePanel'
import ZoomSlider from './components/ZoomSlider'
import ArrangeBar from './components/ArrangeBar'

const GRID_SIZE = 40
const MIN_ZOOM = 0.1
const MAX_ZOOM = 5

let nextId = 1
let nextGroupId = 1

export default function App() {
  // ── Camera ───────────────────────────────────────────────────────
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 })
  const [tool, setTool] = useState('select')
  const [isPanning, setIsPanning] = useState(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const canvasRef = useRef(null)
  const spaceHeld = useRef(false)

  // ── Canvas items ─────────────────────────────────────────────────
  const [items, setItems] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())

  // ── Groups: { groupId: Set<itemId> } ─────────────────────────────
  const [groups, setGroups] = useState({})

  // ── Marquee selection ────────────────────────────────────────────
  const [marquee, setMarquee] = useState(null) // { x1, y1, x2, y2 } in world coords
  const marqueeStart = useRef(null)

  // ── Drag state ───────────────────────────────────────────────────
  const isDraggingItems = useRef(false)

  // ── Timeline ─────────────────────────────────────────────────────
  const [timelineIds, setTimelineIds] = useState([])
  const [timelineOpen, setTimelineOpen] = useState(false)

  // Reverse lookup: itemId → groupId
  const itemGroupMap = useMemo(() => {
    const map = {}
    for (const [gid, memberIds] of Object.entries(groups)) {
      for (const id of memberIds) map[id] = Number(gid)
    }
    return map
  }, [groups])

  // Expand selection to include group members
  const expandedSelection = useMemo(() => {
    const expanded = new Set(selectedIds)
    for (const id of selectedIds) {
      const gid = itemGroupMap[id]
      if (gid != null && groups[gid]) {
        for (const memberId of groups[gid]) expanded.add(memberId)
      }
    }
    return expanded
  }, [selectedIds, itemGroupMap, groups])

  // Selected items array for arrange operations
  const selectedItems = useMemo(
    () => items.filter((it) => expandedSelection.has(it.id)),
    [items, expandedSelection],
  )

  // Does selection contain any grouped item?
  const selectionHasGroup = useMemo(
    () => selectedItems.some((it) => itemGroupMap[it.id] != null),
    [selectedItems, itemGroupMap],
  )

  // ── Zoom ─────────────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setCamera((cam) => {
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cam.zoom * factor))
      const rect = canvasRef.current.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      return {
        x: mx - (mx - cam.x) * (newZoom / cam.zoom),
        y: my - (my - cam.y) * (newZoom / cam.zoom),
        zoom: newZoom,
      }
    })
  }, [])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // ── Pan & Marquee ────────────────────────────────────────────────
  const shouldPan = () => spaceHeld.current || tool === 'pan'

  const screenToWorld = useCallback(
    (sx, sy) => {
      const rect = canvasRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
      return {
        x: (sx - rect.left - camera.x) / camera.zoom,
        y: (sy - rect.top - camera.y) / camera.zoom,
      }
    },
    [camera],
  )

  const handlePointerDown = (e) => {
    if (e.button !== 0) return
    lastPointer.current = { x: e.clientX, y: e.clientY }

    if (shouldPan()) {
      setIsPanning(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    } else if (tool === 'select') {
      // Start marquee selection
      const world = screenToWorld(e.clientX, e.clientY)
      marqueeStart.current = world
      setMarquee(null)
      if (!e.shiftKey) setSelectedIds(new Set())
      e.currentTarget.setPointerCapture(e.pointerId)
    } else {
      setSelectedIds(new Set())
    }
  }

  const handlePointerMove = (e) => {
    if (isPanning) {
      const dx = e.clientX - lastPointer.current.x
      const dy = e.clientY - lastPointer.current.y
      lastPointer.current = { x: e.clientX, y: e.clientY }
      setCamera((cam) => ({ ...cam, x: cam.x + dx, y: cam.y + dy }))
      return
    }

    // Marquee drag
    if (marqueeStart.current && !isDraggingItems.current) {
      const world = screenToWorld(e.clientX, e.clientY)
      setMarquee({
        x1: marqueeStart.current.x,
        y1: marqueeStart.current.y,
        x2: world.x,
        y2: world.y,
      })
    }
  }

  const handlePointerUp = (e) => {
    setIsPanning(false)

    // Finish marquee
    if (marquee && marqueeStart.current) {
      const left = Math.min(marquee.x1, marquee.x2)
      const right = Math.max(marquee.x1, marquee.x2)
      const top = Math.min(marquee.y1, marquee.y2)
      const bottom = Math.max(marquee.y1, marquee.y2)

      // Only count as marquee if dragged at least a few px
      if (right - left > 5 || bottom - top > 5) {
        const hit = items.filter(
          (it) =>
            it.x + it.w > left &&
            it.x < right &&
            it.y + it.h > top &&
            it.y < bottom,
        )
        setSelectedIds((prev) => {
          const next = new Set(e.shiftKey ? prev : [])
          hit.forEach((it) => next.add(it.id))
          return next
        })
      }
    }

    marqueeStart.current = null
    setMarquee(null)
  }

  // ── Space for temp pan ───────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        spaceHeld.current = true
      }
    }
    const up = (e) => {
      if (e.code === 'Space') {
        spaceHeld.current = false
        setIsPanning(false)
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // ── Select All (Ctrl+A) ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        setSelectedIds(new Set(items.map((it) => it.id)))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [items])

  // ── Item select (click / shift-click) ────────────────────────────
  const handleItemSelect = useCallback((id, shiftKey) => {
    setSelectedIds((prev) => {
      if (shiftKey) {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }
      // If already in a multi-selection, keep it (for dragging)
      if (prev.has(id) && prev.size > 1) return prev
      return new Set([id])
    })
  }, [])

  // ── Drag items (moves all selected + group members) ──────────────
  const handleDragStart = useCallback(
    (id) => {
      isDraggingItems.current = true
      // If clicking an unselected item without shift, select just it
      setSelectedIds((prev) => {
        if (!prev.has(id)) return new Set([id])
        return prev
      })
    },
    [],
  )

  const handleDragMove = useCallback(
    (dx, dy) => {
      setItems((prev) =>
        prev.map((it) =>
          expandedSelection.has(it.id)
            ? { ...it, x: it.x + dx, y: it.y + dy }
            : it,
        ),
      )
    },
    [expandedSelection],
  )

  const handleDragEnd = useCallback(() => {
    isDraggingItems.current = false
  }, [])

  // ── Item CRUD ────────────────────────────────────────────────────
  const spawnItem = useCallback(
    (type) => {
      const id = nextId++
      const cx = (-camera.x + window.innerWidth / 2) / camera.zoom
      const cy = (-camera.y + window.innerHeight / 2) / camera.zoom
      const jitter = () => (Math.random() - 0.5) * 120

      const defaults = {
        image: { w: 220, h: 180, duration: 3, name: `Image ${id}` },
        video: { w: 240, h: 180, duration: 5, name: `Video ${id}` },
        note: {
          w: 200,
          h: 140,
          duration: 2,
          name: `Note ${id}`,
          content: 'Double-click to edit',
        },
      }

      const d = defaults[type] || defaults.note
      setItems((prev) => [
        ...prev,
        {
          id,
          type,
          x: cx - d.w / 2 + jitter(),
          y: cy - d.h / 2 + jitter(),
          src: null,
          ...d,
        },
      ])
      setSelectedIds(new Set([id]))
    },
    [camera],
  )

  const deleteSelected = useCallback(() => {
    if (expandedSelection.size === 0) return
    setItems((prev) => prev.filter((it) => !expandedSelection.has(it.id)))
    setTimelineIds((prev) => prev.filter((id) => !expandedSelection.has(id)))
    // Clean up groups
    setGroups((prev) => {
      const next = {}
      for (const [gid, members] of Object.entries(prev)) {
        const remaining = new Set([...members].filter((id) => !expandedSelection.has(id)))
        if (remaining.size > 1) next[gid] = remaining
      }
      return next
    })
    setSelectedIds(new Set())
  }, [expandedSelection])

  // ── Grouping ─────────────────────────────────────────────────────
  const groupSelected = useCallback(() => {
    if (expandedSelection.size < 2) return
    const gid = nextGroupId++
    // Remove these items from any existing groups
    setGroups((prev) => {
      const next = {}
      for (const [oldGid, members] of Object.entries(prev)) {
        const remaining = new Set(
          [...members].filter((id) => !expandedSelection.has(id)),
        )
        if (remaining.size > 1) next[oldGid] = remaining
      }
      next[gid] = new Set(expandedSelection)
      return next
    })
  }, [expandedSelection])

  const ungroupSelected = useCallback(() => {
    const gidsToRemove = new Set()
    for (const id of expandedSelection) {
      if (itemGroupMap[id] != null) gidsToRemove.add(itemGroupMap[id])
    }
    if (gidsToRemove.size === 0) return
    setGroups((prev) => {
      const next = {}
      for (const [gid, members] of Object.entries(prev)) {
        if (!gidsToRemove.has(Number(gid))) next[gid] = members
      }
      return next
    })
  }, [expandedSelection, itemGroupMap])

  // Ctrl+G / Ctrl+Shift+G
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        if (e.shiftKey) ungroupSelected()
        else groupSelected()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [groupSelected, ungroupSelected])

  // ── Align / Distribute ───────────────────────────────────────────
  const handleAlign = useCallback(
    (mode) => {
      if (selectedItems.length < 2) return
      setItems((prev) => {
        const sel = prev.filter((it) => expandedSelection.has(it.id))
        let target
        switch (mode) {
          case 'left':
            target = Math.min(...sel.map((it) => it.x))
            return prev.map((it) =>
              expandedSelection.has(it.id) ? { ...it, x: target } : it,
            )
          case 'right':
            target = Math.max(...sel.map((it) => it.x + it.w))
            return prev.map((it) =>
              expandedSelection.has(it.id)
                ? { ...it, x: target - it.w }
                : it,
            )
          case 'centerH': {
            const minX = Math.min(...sel.map((it) => it.x))
            const maxX = Math.max(...sel.map((it) => it.x + it.w))
            const center = (minX + maxX) / 2
            return prev.map((it) =>
              expandedSelection.has(it.id)
                ? { ...it, x: center - it.w / 2 }
                : it,
            )
          }
          case 'top':
            target = Math.min(...sel.map((it) => it.y))
            return prev.map((it) =>
              expandedSelection.has(it.id) ? { ...it, y: target } : it,
            )
          case 'bottom':
            target = Math.max(...sel.map((it) => it.y + it.h))
            return prev.map((it) =>
              expandedSelection.has(it.id)
                ? { ...it, y: target - it.h }
                : it,
            )
          case 'centerV': {
            const minY = Math.min(...sel.map((it) => it.y))
            const maxY = Math.max(...sel.map((it) => it.y + it.h))
            const center = (minY + maxY) / 2
            return prev.map((it) =>
              expandedSelection.has(it.id)
                ? { ...it, y: center - it.h / 2 }
                : it,
            )
          }
          default:
            return prev
        }
      })
    },
    [selectedItems, expandedSelection],
  )

  const handleDistribute = useCallback(
    (axis) => {
      if (selectedItems.length < 3) return
      setItems((prev) => {
        const sel = prev
          .filter((it) => expandedSelection.has(it.id))
          .sort((a, b) => (axis === 'h' ? a.x - b.x : a.y - b.y))

        if (axis === 'h') {
          const minX = sel[0].x
          const maxX = sel[sel.length - 1].x + sel[sel.length - 1].w
          const totalItemW = sel.reduce((s, it) => s + it.w, 0)
          const gap = (maxX - minX - totalItemW) / (sel.length - 1)
          let cx = minX
          const positions = {}
          for (const it of sel) {
            positions[it.id] = cx
            cx += it.w + gap
          }
          return prev.map((it) =>
            positions[it.id] != null ? { ...it, x: positions[it.id] } : it,
          )
        } else {
          const minY = sel[0].y
          const maxY = sel[sel.length - 1].y + sel[sel.length - 1].h
          const totalItemH = sel.reduce((s, it) => s + it.h, 0)
          const gap = (maxY - minY - totalItemH) / (sel.length - 1)
          let cy = minY
          const positions = {}
          for (const it of sel) {
            positions[it.id] = cy
            cy += it.h + gap
          }
          return prev.map((it) =>
            positions[it.id] != null ? { ...it, y: positions[it.id] } : it,
          )
        }
      })
    },
    [selectedItems, expandedSelection],
  )

  // ── Grid Layout ──────────────────────────────────────────────────
  const handleGridLayout = useCallback(
    ({ cols, gap, sort }) => {
      if (selectedItems.length < 2) return
      setItems((prev) => {
        let sel = prev.filter((it) => expandedSelection.has(it.id))

        // Optionally sort by type then name
        if (sort) {
          const typeOrder = { image: 0, video: 1, note: 2 }
          sel.sort(
            (a, b) =>
              (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9) ||
              a.name.localeCompare(b.name),
          )
        }

        const count = sel.length
        const numCols = cols === 0 ? Math.ceil(Math.sqrt(count)) : Math.max(1, cols)

        // Use max item dimensions per column/row for uniform cell sizing
        const maxW = Math.max(...sel.map((it) => it.w))
        const maxH = Math.max(...sel.map((it) => it.h))

        // Anchor grid at top-left of current bounding box
        const anchorX = Math.min(...sel.map((it) => it.x))
        const anchorY = Math.min(...sel.map((it) => it.y))

        const positions = {}
        sel.forEach((it, i) => {
          const col = i % numCols
          const row = Math.floor(i / numCols)
          // Center each item within its cell
          positions[it.id] = {
            x: anchorX + col * (maxW + gap) + (maxW - it.w) / 2,
            y: anchorY + row * (maxH + gap) + (maxH - it.h) / 2,
          }
        })

        return prev.map((it) =>
          positions[it.id]
            ? { ...it, x: positions[it.id].x, y: positions[it.id].y }
            : it,
        )
      })
    },
    [selectedItems, expandedSelection],
  )

  // ── Timeline ops ─────────────────────────────────────────────────
  const addToTimeline = useCallback((id) => {
    setTimelineIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setTimelineOpen(true)
  }, [])

  const removeFromTimeline = useCallback((index) => {
    setTimelineIds((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const reorderTimeline = useCallback((fromIdx, toIdx) => {
    setTimelineIds((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
  }, [])

  // ── Focus item ───────────────────────────────────────────────────
  const focusItem = useCallback(
    (id) => {
      const item = items.find((i) => i.id === id)
      if (!item) return
      setSelectedIds(new Set([id]))
      setCamera((cam) => ({
        ...cam,
        x: -(item.x + item.w / 2) * cam.zoom + window.innerWidth / 2,
        y: -(item.y + item.h / 2) * cam.zoom + window.innerHeight / 2,
      }))
    },
    [items],
  )

  // ── Render ───────────────────────────────────────────────────────
  const gridStyle = {
    backgroundImage:
      'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
    backgroundSize: `${GRID_SIZE * camera.zoom}px ${GRID_SIZE * camera.zoom}px`,
    backgroundPosition: `${camera.x}px ${camera.y}px`,
  }

  const cursor = isPanning ? 'grabbing' : shouldPan() ? 'grab' : tool === 'select' ? 'crosshair' : 'default'

  // Marquee rect in world coords → for rendering inside transform group
  const marqueeRect = marquee
    ? {
        x: Math.min(marquee.x1, marquee.x2),
        y: Math.min(marquee.y1, marquee.y2),
        w: Math.abs(marquee.x2 - marquee.x1),
        h: Math.abs(marquee.y2 - marquee.y1),
      }
    : null

  return (
    <div className="relative h-screen w-screen bg-neutral-950 overflow-hidden select-none">
      <Navbar />

      {/* Canvas surface */}
      <div
        ref={canvasRef}
        className="absolute inset-0 top-11"
        style={{ ...gridStyle, cursor }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Transform group */}
        <div
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Origin crosshair */}
          <div
            className="absolute w-6 h-px bg-neutral-700"
            style={{ left: -12, top: 0 }}
          />
          <div
            className="absolute h-6 w-px bg-neutral-700"
            style={{ top: -12, left: 0 }}
          />

          {/* Canvas items */}
          {items.map((item) => (
            <CanvasItem
              key={item.id}
              item={item}
              selected={expandedSelection.has(item.id)}
              timelineIndex={
                timelineIds.includes(item.id)
                  ? timelineIds.indexOf(item.id)
                  : null
              }
              groupId={itemGroupMap[item.id] ?? null}
              zoom={camera.zoom}
              onSelect={handleItemSelect}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
            />
          ))}

          {/* Marquee rectangle */}
          {marqueeRect && marqueeRect.w > 2 && marqueeRect.h > 2 && (
            <div
              className="absolute border border-indigo-400/60 bg-indigo-400/10 rounded-sm pointer-events-none"
              style={{
                left: marqueeRect.x,
                top: marqueeRect.y,
                width: marqueeRect.w,
                height: marqueeRect.h,
              }}
            />
          )}
        </div>
      </div>

      <Toolbar tool={tool} setTool={setTool} onDelete={deleteSelected} />

      <HudPanel
        items={items}
        timelineIds={timelineIds}
        onSpawn={spawnItem}
        onAddToTimeline={addToTimeline}
        onFocusItem={focusItem}
      />

      <TimelinePanel
        open={timelineOpen}
        onToggle={() => setTimelineOpen((o) => !o)}
        timelineIds={timelineIds}
        canvasItems={items}
        onRemoveFromTimeline={removeFromTimeline}
        onReorderTimeline={reorderTimeline}
      />

      {/* Arrange bar — shows when 2+ items selected */}
      <ArrangeBar
        selectedCount={expandedSelection.size}
        hasGroup={selectionHasGroup}
        onAlign={handleAlign}
        onDistribute={handleDistribute}
        onGroup={groupSelected}
        onUngroup={ungroupSelected}
        onGridLayout={handleGridLayout}
      />

      <ZoomSlider
        zoom={camera.zoom}
        onZoomChange={(z) =>
          setCamera((cam) => {
            const cx = window.innerWidth / 2
            const cy = window.innerHeight / 2
            return {
              x: cx - (cx - cam.x) * (z / cam.zoom),
              y: cy - (cy - cam.y) * (z / cam.zoom),
              zoom: z,
            }
          })
        }
      />

      {/* Coordinates */}
      <div className="absolute bottom-4 right-4 bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-md px-3 py-1.5 text-xs font-mono text-neutral-500 z-20">
        {Math.round(-camera.x / camera.zoom)},{' '}
        {Math.round(-camera.y / camera.zoom)}
      </div>
    </div>
  )
}
