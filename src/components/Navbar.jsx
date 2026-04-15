import { Clapperboard, Save, Download, Settings, Undo2, Redo2 } from 'lucide-react'

export default function Navbar() {
  return (
    <nav className="absolute top-0 left-0 right-0 h-11 bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-800 flex items-center px-3 z-50 select-none">
      {/* Brand */}
      <div className="flex items-center gap-2 mr-6">
        <Clapperboard size={18} className="text-indigo-400" />
        <span className="text-sm font-semibold text-neutral-200 tracking-wide">
          FrameForge
        </span>
      </div>

      {/* Menu items */}
      <div className="flex items-center gap-0.5">
        <NavBtn label="File" />
        <NavBtn label="Edit" />
        <NavBtn label="View" />
        <NavBtn label="Export" />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <ActionBtn icon={Undo2} title="Undo (Ctrl+Z)" />
        <ActionBtn icon={Redo2} title="Redo (Ctrl+Shift+Z)" />
        <div className="w-px h-5 bg-neutral-800 mx-1.5" />
        <ActionBtn icon={Save} title="Save" />
        <ActionBtn icon={Download} title="Export" />
        <ActionBtn icon={Settings} title="Settings" />
      </div>
    </nav>
  )
}

function NavBtn({ label }) {
  return (
    <button className="px-2.5 py-1 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors">
      {label}
    </button>
  )
}

function ActionBtn({ icon: Icon, title }) {
  return (
    <button
      title={title}
      className="flex items-center justify-center w-8 h-8 rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
    >
      <Icon size={16} />
    </button>
  )
}
