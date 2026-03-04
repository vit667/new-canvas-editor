import {
  Settings,
  Trash2,
} from "lucide-react"

interface EdgeContextMenuProps {
  position: { x: number; y: number }
  onEdit: () => void
  onDelete: () => void
}

export function EdgeContextMenu({
  position,
  onEdit,
  onDelete,
}: EdgeContextMenuProps) {
  return (
    <div
      data-context-menu
      className="fixed z-50 min-w-[12rem] overflow-hidden rounded-md border bg-white p-1 text-gray-900 shadow-lg animate-in fade-in-0 zoom-in-95"
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        onClick={onEdit}
      >
        <Settings className="h-4 w-4" />
        <span>Настроить связь</span>
      </div>

      <div className="-mx-1 my-1 h-px bg-border" />

      <div
        className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none text-red-600 hover:bg-red-50 hover:text-red-600"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
        <span>Удалить связь</span>
        <span className="ml-auto text-xs tracking-widest text-muted-foreground">
          Delete
        </span>
      </div>
    </div>
  )
}
