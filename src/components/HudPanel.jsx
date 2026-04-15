import { useState, useRef, useMemo } from 'react'
import {
  Image,
  Film,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Plus,
  Grip,
  ListVideo,
  Wrench,
  ArrowUpDown,
  Group,
} from 'lucide-react'

const SPAWN_TYPES = [
  { type: 'image', icon: Image, label: 'Image', color: 'text-indigo-400' },
  { type: 'video', icon: Film, label: 'Video', color: 'text-purple-400' },
  { type: 'note', icon: StickyNote, label: 'Note', color: 'text-amber-400' },
]

const TYPE_ICONS = { image: Image, video: Film, note: StickyNote }
const TYPE_ORDER = { image: 0, video: 1, note: 2 }

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'name', label: 'Name A–Z' },
  { id: 'name-desc', label: 'Name Z–A' },
  { id: 'duration', label: 'Duration ↓' },
  { id: 'type', label: 'Type' },
]

const GROUP_OPTIONS = [
  { id: 'none', label: 'No grouping' },
  { id: 'type', label: 'By type' },
  { id: 'timeline', label: 'By timeline status' },
]

export default function HudPanel({
  items,
  timelineIds,
  onSpawn,
  onAddToTimeline,
  onFocusItem,
}) {
  const [minimized, setMinimized] = useState(false)
  const [tab, setTab] = useState('toolkit')
  const [pos, setPos] = useState({ x: 16, y: 72 })
  const [sortBy, setSortBy] = useState('newest')
  const [groupBy, setGroupBy] = useState('none')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showGroupMenu, setShowGroupMenu] = useState(false)
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const handleGripDown = (e) => {
    dragging.current = true
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleGripMove = (e) => {
    if (!dragging.current) return
    setPos({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    })
  }

  const handleGripUp = () => {
    dragging.current = false
  }

  // Sort items
  const sortedItems = useMemo(() => {
    const sorted = [...items]
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => b.id - a.id)
        break
      case 'oldest':
        sorted.sort((a, b) => a.id - b.id)
        break
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'duration':
        sorted.sort((a, b) => (b.duration || 0) - (a.duration || 0))
        break
      case 'type':
        sorted.sort((a, b) => (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9))
        break
    }
    return sorted
  }, [items, sortBy])

  // Group items
  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ label: null, items: sortedItems }]

    const map = new Map()
    for (const item of sortedItems) {
      let key
      if (groupBy === 'type') {
        key = item.type.charAt(0).toUpperCase() + item.type.slice(1) + 's'
      } else {
        key = timelineIds.includes(item.id) ? 'In Timeline' : 'Not in Timeline'
      }
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    }
    return Array.from(map, ([label, items]) => ({ label, items }))
  }, [sortedItems, groupBy, timelineIds])

  return (
    <div
      className="absolute z-40 w-64 bg-neutral-900/95 backdrop-blur-sm border border-neutral-800 rounded-lg shadow-xl overflow-hidden select-none"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 bg-neutral-800/60 border-b border-neutral-700/50 cursor-move"
        onPointerDown={handleGripDown}
        onPointerMove={handleGripMove}
        onPointerUp={handleGripUp}
      >
        <Grip size={14} className="text-neutral-500" />
        <span className="text-xs font-semibold text-neutral-300 flex-1 uppercase tracking-wider">
          HUD
        </span>
        <button
          onClick={() => setMinimized(!minimized)}
          className="text-neutral-500 hover:text-neutral-300"
        >
          {minimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {!minimized && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-neutral-800">
            <button
              onClick={() => setTab('toolkit')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors ${
                tab === 'toolkit'
                  ? 'text-indigo-400 border-b-2 border-indigo-400'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <Wrench size={12} /> Toolkit
            </button>
            <button
              onClick={() => setTab('inventory')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors ${
                tab === 'inventory'
                  ? 'text-indigo-400 border-b-2 border-indigo-400'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <ListVideo size={12} /> Inventory
              {items.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-neutral-800 text-[10px] text-neutral-400">
                  {items.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className="p-3">
            {tab === 'toolkit' ? (
              <div className="grid grid-cols-3 gap-2">
                {SPAWN_TYPES.map((s) => (
                  <button
                    key={s.type}
                    onClick={() => onSpawn(s.type)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-md bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 hover:border-neutral-600 transition-colors"
                  >
                    <s.icon size={20} className={s.color} />
                    <span className="text-[10px] text-neutral-400">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                {/* Sort & Group controls */}
                {items.length > 0 && (
                  <div className="flex gap-1 mb-2">
                    {/* Sort dropdown */}
                    <div className="relative flex-1">
                      <button
                        onClick={() => {
                          setShowSortMenu(!showSortMenu)
                          setShowGroupMenu(false)
                        }}
                        className={`flex items-center gap-1 w-full px-2 py-1 rounded text-[10px] transition-colors border ${
                          showSortMenu
                            ? 'bg-neutral-800 border-neutral-600 text-neutral-200'
                            : 'bg-neutral-800/50 border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <ArrowUpDown size={10} />
                        <span className="truncate">
                          {SORT_OPTIONS.find((o) => o.id === sortBy)?.label}
                        </span>
                      </button>
                      {showSortMenu && (
                        <div className="absolute top-full left-0 mt-1 w-36 bg-neutral-850 bg-neutral-800 border border-neutral-700 rounded-md shadow-xl z-10 py-1">
                          {SORT_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => {
                                setSortBy(opt.id)
                                setShowSortMenu(false)
                              }}
                              className={`block w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                                sortBy === opt.id
                                  ? 'text-indigo-400 bg-indigo-500/10'
                                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Group dropdown */}
                    <div className="relative flex-1">
                      <button
                        onClick={() => {
                          setShowGroupMenu(!showGroupMenu)
                          setShowSortMenu(false)
                        }}
                        className={`flex items-center gap-1 w-full px-2 py-1 rounded text-[10px] transition-colors border ${
                          showGroupMenu
                            ? 'bg-neutral-800 border-neutral-600 text-neutral-200'
                            : 'bg-neutral-800/50 border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <Group size={10} />
                        <span className="truncate">
                          {GROUP_OPTIONS.find((o) => o.id === groupBy)?.label}
                        </span>
                      </button>
                      {showGroupMenu && (
                        <div className="absolute top-full right-0 mt-1 w-40 bg-neutral-800 border border-neutral-700 rounded-md shadow-xl z-10 py-1">
                          {GROUP_OPTIONS.map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => {
                                setGroupBy(opt.id)
                                setShowGroupMenu(false)
                              }}
                              className={`block w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                                groupBy === opt.id
                                  ? 'text-indigo-400 bg-indigo-500/10'
                                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Item list with groups */}
                <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                  {items.length === 0 ? (
                    <p className="text-[11px] text-neutral-600 text-center py-4">
                      No items on canvas
                    </p>
                  ) : (
                    groups.map((group) => (
                      <div key={group.label || '__all'}>
                        {group.label && (
                          <div className="flex items-center gap-2 px-1 pt-2 pb-1">
                            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                              {group.label}
                            </span>
                            <div className="flex-1 h-px bg-neutral-800" />
                            <span className="text-[10px] text-neutral-600">
                              {group.items.length}
                            </span>
                          </div>
                        )}
                        {group.items.map((item) => (
                          <InventoryRow
                            key={item.id}
                            item={item}
                            inTimeline={timelineIds.includes(item.id)}
                            onFocus={() => onFocusItem(item.id)}
                            onAdd={() => onAddToTimeline(item.id)}
                          />
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function InventoryRow({ item, inTimeline, onFocus, onAdd }) {
  const Icon = TYPE_ICONS[item.type] || StickyNote
  return (
    <div
      onClick={onFocus}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-800/80 cursor-pointer group"
    >
      <div className="w-8 h-8 rounded bg-neutral-800 border border-neutral-700/50 flex items-center justify-center shrink-0">
        <Icon size={14} className="text-neutral-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-neutral-300 truncate">{item.name}</p>
        {item.duration && (
          <p className="text-[10px] text-neutral-600 font-mono">
            {item.duration.toFixed(1)}s
          </p>
        )}
      </div>
      {!inTimeline ? (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAdd()
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition-all"
          title="Add to timeline"
        >
          <Plus size={14} />
        </button>
      ) : (
        <span className="text-[10px] text-emerald-500 font-mono px-1">TL</span>
      )}
    </div>
  )
}
