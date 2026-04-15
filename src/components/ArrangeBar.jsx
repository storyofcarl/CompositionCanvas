import { useState } from 'react'
import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  Group,
  Ungroup,
  LayoutGrid,
  Rows3,
  Columns3,
  Grid2x2,
  ArrowDownNarrowWide,
} from 'lucide-react'

export default function ArrangeBar({
  selectedCount,
  hasGroup,
  onAlign,
  onDistribute,
  onGroup,
  onUngroup,
  onGridLayout,
}) {
  const [showGrid, setShowGrid] = useState(false)
  const [cols, setCols] = useState(0) // 0 = auto
  const [gap, setGap] = useState(24)

  if (selectedCount < 2) return null

  return (
    <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-neutral-900/95 backdrop-blur-sm border border-neutral-800 rounded-lg p-1 shadow-xl z-40">
      {/* Align */}
      <Label>Align</Label>
      <Btn icon={AlignStartVertical} title="Align left" onClick={() => onAlign('left')} />
      <Btn icon={AlignCenterVertical} title="Align center H" onClick={() => onAlign('centerH')} />
      <Btn icon={AlignEndVertical} title="Align right" onClick={() => onAlign('right')} />
      <Sep />
      <Btn icon={AlignStartHorizontal} title="Align top" onClick={() => onAlign('top')} />
      <Btn icon={AlignCenterHorizontal} title="Align center V" onClick={() => onAlign('centerV')} />
      <Btn icon={AlignEndHorizontal} title="Align bottom" onClick={() => onAlign('bottom')} />
      <Sep />

      {/* Distribute */}
      <Label>Space</Label>
      <Btn icon={AlignHorizontalSpaceAround} title="Distribute horizontally" onClick={() => onDistribute('h')} />
      <Btn icon={AlignVerticalSpaceAround} title="Distribute vertically" onClick={() => onDistribute('v')} />
      <Sep />

      {/* Grid layouts */}
      <Label>Grid</Label>
      <Btn icon={Rows3} title="Arrange in a single row" onClick={() => onGridLayout({ cols: selectedCount, gap })} />
      <Btn icon={Columns3} title="Arrange in a single column" onClick={() => onGridLayout({ cols: 1, gap })} />
      <Btn icon={Grid2x2} title="Auto grid (square-ish)" onClick={() => onGridLayout({ cols: 0, gap })} />
      <div className="relative">
        <Btn
          icon={LayoutGrid}
          title="Custom grid layout..."
          onClick={() => setShowGrid(!showGrid)}
          active={showGrid}
        />
        {showGrid && (
          <GridPopover
            count={selectedCount}
            cols={cols}
            gap={gap}
            onColsChange={setCols}
            onGapChange={setGap}
            onApply={() => {
              onGridLayout({ cols, gap })
              setShowGrid(false)
            }}
            onClose={() => setShowGrid(false)}
          />
        )}
      </div>
      <Sep />

      {/* Sort into grid by name/type */}
      <Btn icon={ArrowDownNarrowWide} title="Tidy: sort by type then grid" onClick={() => onGridLayout({ cols: 0, gap, sort: true })} />
      <Sep />

      {/* Group / Ungroup */}
      <Btn icon={Group} title="Group (Ctrl+G)" onClick={onGroup} accent />
      {hasGroup && (
        <Btn icon={Ungroup} title="Ungroup (Ctrl+Shift+G)" onClick={onUngroup} />
      )}

      <span className="text-[10px] text-neutral-500 pl-2 pr-1 font-mono">
        {selectedCount}
      </span>
    </div>
  )
}

function GridPopover({ count, cols, gap, onColsChange, onGapChange, onApply, onClose }) {
  const autoCols = Math.ceil(Math.sqrt(count))
  const effectiveCols = cols === 0 ? autoCols : cols
  const rows = Math.ceil(count / effectiveCols)

  return (
    <div
      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-52 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl p-3 z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-neutral-300">Grid Layout</span>
        <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300 text-xs">
          ✕
        </button>
      </div>

      {/* Columns */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-neutral-500">Columns</span>
          <span className="text-[10px] text-neutral-400 font-mono">
            {cols === 0 ? `auto (${autoCols})` : cols}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.min(count, 12)}
          value={cols}
          onChange={(e) => onColsChange(Number(e.target.value))}
          className="w-full h-1 appearance-none bg-neutral-700 rounded-full cursor-pointer accent-indigo-500
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-400
            [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-400 [&::-moz-range-thumb]:border-0"
        />
      </div>

      {/* Gap */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-neutral-500">Gap</span>
          <span className="text-[10px] text-neutral-400 font-mono">{gap}px</span>
        </div>
        <input
          type="range"
          min={0}
          max={80}
          step={4}
          value={gap}
          onChange={(e) => onGapChange(Number(e.target.value))}
          className="w-full h-1 appearance-none bg-neutral-700 rounded-full cursor-pointer accent-indigo-500
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-400
            [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-indigo-400 [&::-moz-range-thumb]:border-0"
        />
      </div>

      {/* Preview hint */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-neutral-600">
          {effectiveCols} cols × {rows} rows
        </span>
        <span className="text-[10px] text-neutral-600">{count} items</span>
      </div>

      <button
        onClick={onApply}
        className="w-full py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium transition-colors"
      >
        Apply Grid
      </button>
    </div>
  )
}

function Btn({ icon: Icon, title, onClick, accent, active }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : accent
            ? 'text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300'
            : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800'
      }`}
    >
      <Icon size={15} />
    </button>
  )
}

function Label({ children }) {
  return (
    <span className="text-[9px] text-neutral-600 uppercase tracking-wider px-1.5">
      {children}
    </span>
  )
}

function Sep() {
  return <div className="w-px h-5 bg-neutral-800 mx-0.5" />
}
