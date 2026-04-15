import { useRef } from 'react'
import { Image, Film, StickyNote, GripVertical } from 'lucide-react'

const TYPE_ICONS = { image: Image, video: Film, note: StickyNote }
const TYPE_COLORS = {
  image: 'border-indigo-500/60',
  video: 'border-purple-500/60',
  note: 'border-amber-500/60',
}

export default function CanvasItem({
  item,
  selected,
  timelineIndex,
  groupId,
  zoom,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}) {
  const dragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })

  const Icon = TYPE_ICONS[item.type] || StickyNote

  const handlePointerDown = (e) => {
    e.stopPropagation()
    onSelect(item.id, e.shiftKey)
    dragging.current = true
    startPos.current = { x: e.clientX, y: e.clientY }
    onDragStart(item.id)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e) => {
    if (!dragging.current) return
    const dx = (e.clientX - startPos.current.x) / zoom
    const dy = (e.clientY - startPos.current.y) / zoom
    startPos.current = { x: e.clientX, y: e.clientY }
    onDragMove(dx, dy)
  }

  const handlePointerUp = () => {
    if (!dragging.current) return
    dragging.current = false
    onDragEnd()
  }

  return (
    <div
      className={`absolute group cursor-move ${selected ? 'ring-2 ring-indigo-400' : ''}`}
      style={{
        left: item.x,
        top: item.y,
        width: item.w,
        height: item.h,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Main tile */}
      <div
        className={`relative w-full h-full rounded-lg border-2 ${TYPE_COLORS[item.type]} bg-neutral-900 overflow-hidden flex flex-col`}
      >
        {/* Header bar */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-neutral-800/80 border-b border-neutral-700/50 shrink-0">
          <GripVertical size={12} className="text-neutral-500" />
          <Icon size={13} className="text-neutral-400" />
          <span className="text-[11px] text-neutral-300 truncate flex-1">
            {item.name}
          </span>
          {item.duration && (
            <span className="text-[10px] text-neutral-500 font-mono">
              {item.duration.toFixed(1)}s
            </span>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          {item.type === 'note' ? (
            <p className="text-xs text-neutral-400 p-3 leading-relaxed text-left w-full">
              {item.content || 'Empty note'}
            </p>
          ) : item.src ? (
            item.type === 'video' ? (
              <video
                src={item.src}
                className="w-full h-full object-cover"
                muted
              />
            ) : (
              <img
                src={item.src}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-neutral-600">
              <Icon size={28} />
              <span className="text-[10px] uppercase tracking-wider">
                {item.type}
              </span>
            </div>
          )}
        </div>

        {/* Group badge */}
        {groupId != null && (
          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-indigo-500/20 text-[9px] text-indigo-300 font-mono">
            G{groupId}
          </div>
        )}
      </div>

      {/* Timeline badge — green ring + number */}
      {timelineIndex != null && (
        <>
          <div className="absolute inset-0 rounded-lg ring-2 ring-emerald-400/70 pointer-events-none" />
          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
            {timelineIndex + 1}
          </div>
        </>
      )}
    </div>
  )
}
