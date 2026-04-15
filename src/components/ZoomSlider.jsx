import { Minus, Plus } from 'lucide-react'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5

// Map zoom to a 0-1 slider using a log scale (feels linear to the user)
const zoomToSlider = (z) =>
  (Math.log(z) - Math.log(MIN_ZOOM)) / (Math.log(MAX_ZOOM) - Math.log(MIN_ZOOM))

const sliderToZoom = (s) =>
  Math.exp(Math.log(MIN_ZOOM) + s * (Math.log(MAX_ZOOM) - Math.log(MIN_ZOOM)))

export default function ZoomSlider({ zoom, onZoomChange }) {
  const sliderVal = zoomToSlider(zoom)

  const step = (dir) => {
    const factor = dir > 0 ? 1.2 : 1 / 1.2
    onZoomChange(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor)))
  }

  const handleSlider = (e) => {
    onZoomChange(sliderToZoom(parseFloat(e.target.value)))
  }

  const handleReset = () => onZoomChange(1)

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-neutral-900/90 backdrop-blur-sm border border-neutral-800 rounded-lg px-2 py-1.5 z-20 select-none">
      <button
        onClick={() => step(-1)}
        className="p-1 text-neutral-500 hover:text-neutral-200 transition-colors"
        title="Zoom out"
      >
        <Minus size={14} />
      </button>

      <input
        type="range"
        min={0}
        max={1}
        step={0.005}
        value={sliderVal}
        onChange={handleSlider}
        className="w-24 h-1 appearance-none bg-neutral-700 rounded-full cursor-pointer accent-indigo-500
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:hover:bg-indigo-300
          [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-400 [&::-moz-range-thumb]:border-0"
      />

      <button
        onClick={() => step(1)}
        className="p-1 text-neutral-500 hover:text-neutral-200 transition-colors"
        title="Zoom in"
      >
        <Plus size={14} />
      </button>

      <button
        onClick={handleReset}
        className="ml-0.5 px-1.5 py-0.5 text-[11px] font-mono text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors min-w-[3rem] text-center"
        title="Reset to 100%"
      >
        {Math.round(zoom * 100)}%
      </button>
    </div>
  )
}
