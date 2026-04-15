import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  X,
  Image,
  Film,
  StickyNote,
  GripVertical,
  Trash2,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'

const MIN_WIDTH = 340
const TYPE_ICONS = { image: Image, video: Film, note: StickyNote }

export default function TimelinePanel({
  open,
  onToggle,
  timelineIds,
  canvasItems,
  onRemoveFromTimeline,
  onReorderTimeline,
}) {
  const [width, setWidth] = useState(380)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const rafRef = useRef(null)
  const lastFrameTime = useRef(null)
  const resizing = useRef(false)

  // Derive clips from timeline order
  const clips = useMemo(() => {
    let cumulative = 0
    return timelineIds
      .map((id) => {
        const item = canvasItems.find((i) => i.id === id)
        if (!item) return null
        const clip = {
          ...item,
          startTime: cumulative,
          endTime: cumulative + (item.duration || 2),
        }
        cumulative += item.duration || 2
        return clip
      })
      .filter(Boolean)
  }, [timelineIds, canvasItems])

  const totalDuration = clips.length > 0 ? clips[clips.length - 1].endTime : 0

  const currentClip = useMemo(
    () =>
      clips.find((c) => currentTime >= c.startTime && currentTime < c.endTime),
    [clips, currentTime],
  )

  // Playback RAF loop
  const tick = useCallback(
    (timestamp) => {
      if (lastFrameTime.current == null) lastFrameTime.current = timestamp
      const delta = (timestamp - lastFrameTime.current) / 1000
      lastFrameTime.current = timestamp

      setCurrentTime((t) => {
        const next = t + delta
        if (next >= totalDuration) {
          setPlaying(false)
          return totalDuration
        }
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    },
    [totalDuration],
  )

  useEffect(() => {
    if (playing && totalDuration > 0) {
      lastFrameTime.current = null
      rafRef.current = requestAnimationFrame(tick)
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, tick, totalDuration])

  const handlePlay = () => {
    if (totalDuration === 0) return
    if (currentTime >= totalDuration) setCurrentTime(0)
    setPlaying(true)
  }
  const handlePause = () => setPlaying(false)
  const handleStop = () => {
    setPlaying(false)
    setCurrentTime(0)
  }
  const handleSkipBack = () => {
    setPlaying(false)
    setCurrentTime(0)
  }
  const handleSkipForward = () => {
    setPlaying(false)
    setCurrentTime(totalDuration)
  }

  // Resize handle
  const handleResizeDown = (e) => {
    e.preventDefault()
    resizing.current = true
    const startX = e.clientX
    const startW = width
    const onMove = (ev) => {
      if (!resizing.current) return
      const maxW = window.innerWidth * 0.5
      const newW = Math.max(MIN_WIDTH, Math.min(maxW, startW + (startX - ev.clientX)))
      setWidth(newW)
    }
    const onUp = () => {
      resizing.current = false
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  // Scrub
  const handleScrub = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setCurrentTime(pct * totalDuration)
  }

  // Drag reorder state
  const dragIdx = useRef(null)
  const handleDragStart = (idx) => {
    dragIdx.current = idx
  }
  const handleDragOver = (e, idx) => {
    e.preventDefault()
    if (dragIdx.current == null || dragIdx.current === idx) return
    onReorderTimeline(dragIdx.current, idx)
    dragIdx.current = idx
  }
  const handleDragEnd = () => {
    dragIdx.current = null
  }

  const formatTime = (t) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    const ms = Math.floor((t % 1) * 10)
    return `${m}:${String(s).padStart(2, '0')}.${ms}`
  }

  // Toggle button when panel is closed
  if (!open) {
    return (
      <button
        onClick={onToggle}
        className="absolute top-14 right-4 z-40 p-2 bg-neutral-900/90 backdrop-blur-sm border border-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-200 transition-colors"
        title="Open Timeline"
      >
        <PanelRightOpen size={18} />
      </button>
    )
  }

  return (
    <div
      className="absolute top-11 right-0 bottom-0 bg-neutral-900/95 backdrop-blur-sm border-l border-neutral-800 flex flex-col z-30"
      style={{ width }}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-500/30 transition-colors"
        onPointerDown={handleResizeDown}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 shrink-0">
        <h2 className="text-sm font-semibold text-neutral-200 tracking-wide">
          Timeline
        </h2>
        <button
          onClick={onToggle}
          className="text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <PanelRightClose size={16} />
        </button>
      </div>

      {/* Preview */}
      <div className="mx-4 mt-3 aspect-video bg-black rounded-lg overflow-hidden border border-neutral-800 shrink-0">
        {currentClip ? (
          currentClip.type === 'video' && currentClip.src ? (
            <video
              src={currentClip.src}
              className="w-full h-full object-contain"
              muted
            />
          ) : currentClip.type === 'image' && currentClip.src ? (
            <img
              src={currentClip.src}
              alt={currentClip.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <PreviewPlaceholder clip={currentClip} />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-700 text-xs">
            {clips.length === 0 ? 'Add clips to preview' : 'No clip at playhead'}
          </div>
        )}
      </div>

      {/* Transport */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        {/* Scrub bar */}
        <div
          className="relative h-2 bg-neutral-800 rounded-full cursor-pointer mb-3 group"
          onClick={handleScrub}
        >
          <div
            className="absolute h-full bg-indigo-500 rounded-full"
            style={{
              width: totalDuration > 0 ? `${(currentTime / totalDuration) * 100}%` : '0%',
            }}
          />
          {/* Clip segments */}
          {clips.map((clip, i) => (
            <div
              key={clip.id}
              className="absolute top-0 h-full border-r border-neutral-700/50"
              style={{
                left: `${(clip.startTime / totalDuration) * 100}%`,
                width: `${((clip.endTime - clip.startTime) / totalDuration) * 100}%`,
              }}
            />
          ))}
          {/* Playhead */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md group-hover:scale-125 transition-transform"
            style={{
              left: `calc(${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}% - 6px)`,
            }}
          />
        </div>

        {/* Time + buttons */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-neutral-500">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
          <div className="flex items-center gap-1">
            <TransportBtn icon={SkipBack} onClick={handleSkipBack} />
            {playing ? (
              <TransportBtn icon={Pause} onClick={handlePause} primary />
            ) : (
              <TransportBtn icon={Play} onClick={handlePlay} primary />
            )}
            <TransportBtn icon={Square} onClick={handleStop} />
            <TransportBtn icon={SkipForward} onClick={handleSkipForward} />
          </div>
        </div>
      </div>

      {/* Tracks */}
      <div className="flex-1 overflow-hidden flex flex-col border-t border-neutral-800 mt-2">
        {/* Track header */}
        <div className="flex items-center px-4 py-2 bg-neutral-800/40 border-b border-neutral-800 shrink-0">
          <Film size={12} className="text-purple-400 mr-2" />
          <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
            Video Track
          </span>
          <span className="ml-auto text-[10px] text-neutral-600 font-mono">
            {clips.length} clip{clips.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Clip list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
          {clips.length === 0 ? (
            <p className="text-[11px] text-neutral-600 text-center py-6">
              Add items from the Inventory
            </p>
          ) : (
            clips.map((clip, i) => {
              const Icon = TYPE_ICONS[clip.type] || StickyNote
              const isCurrent =
                currentClip && currentClip.id === clip.id
              return (
                <div
                  key={`${clip.id}-${i}`}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 px-2 py-2 mb-1 rounded-md border transition-colors cursor-grab active:cursor-grabbing ${
                    isCurrent
                      ? 'bg-indigo-500/10 border-indigo-500/40'
                      : 'bg-neutral-800/40 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <GripVertical
                    size={12}
                    className="text-neutral-600 shrink-0"
                  />
                  <div className="w-7 h-7 rounded bg-neutral-800 border border-neutral-700/50 flex items-center justify-center shrink-0">
                    <Icon size={13} className="text-neutral-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-neutral-300 truncate">
                      {clip.name}
                    </p>
                    <p className="text-[10px] text-neutral-600 font-mono">
                      {formatTime(clip.startTime)} –{' '}
                      {formatTime(clip.endTime)}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemoveFromTimeline(i)}
                    className="p-1 rounded hover:bg-red-500/20 text-neutral-600 hover:text-red-400 transition-colors"
                    title="Remove from timeline"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Audio & Text track headers (placeholder) */}
        <div className="border-t border-neutral-800">
          <TrackPlaceholder icon={Film} label="Audio Track" color="text-emerald-400" />
          <TrackPlaceholder icon={StickyNote} label="Text Track" color="text-amber-400" />
        </div>
      </div>
    </div>
  )
}

function PreviewPlaceholder({ clip }) {
  const Icon = TYPE_ICONS[clip.type] || StickyNote
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 gap-2">
      <Icon size={32} />
      <span className="text-xs">{clip.name}</span>
    </div>
  )
}

function TransportBtn({ icon: Icon, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors ${
        primary
          ? 'bg-indigo-600 text-white hover:bg-indigo-500'
          : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
      }`}
    >
      <Icon size={14} />
    </button>
  )
}

function TrackPlaceholder({ icon: Icon, label, color }) {
  return (
    <div className="flex items-center px-4 py-2 border-b border-neutral-800/50">
      <Icon size={12} className={`${color} mr-2`} />
      <span className="text-[11px] text-neutral-600 uppercase tracking-wider">
        {label}
      </span>
      <span className="ml-auto text-[10px] text-neutral-700 italic">
        coming soon
      </span>
    </div>
  )
}
