import { useEffect } from 'react'
import { MousePointer2, Hand, Trash2 } from 'lucide-react'

const TOOLS = [
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { id: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
  { id: 'delete', icon: Trash2, label: 'Delete', shortcut: 'X' },
]

export default function Toolbar({ tool, setTool, onDelete }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'v') setTool('select')
      else if (key === 'h') setTool('pan')
      else if (key === 'x') setTool('delete')
      else if ((key === 'delete' || key === 'backspace') && onDelete) onDelete()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setTool, onDelete])

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 flex gap-1 bg-neutral-900/90 backdrop-blur-sm border border-neutral-800 rounded-lg p-1 shadow-lg z-40">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          onClick={() => {
            if (t.id === 'delete') onDelete?.()
            else setTool(t.id)
          }}
          title={`${t.label} (${t.shortcut})`}
          className={`flex items-center justify-center w-9 h-9 rounded-md transition-colors ${
            tool === t.id && t.id !== 'delete'
              ? 'bg-indigo-600 text-white'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
          }`}
        >
          <t.icon size={18} />
        </button>
      ))}
    </div>
  )
}
