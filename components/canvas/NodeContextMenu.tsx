import {
  Edit,
  Copy,
  Clipboard,
  Trash2,
} from "lucide-react"

interface NodeContextMenuProps {
  position: { x: number; y: number }
  onEdit: () => void
  onClone: () => void
  onCopy: () => void
  onDelete: () => void
}

export function NodeContextMenu({
  position,
  onEdit,
  onClone,
  onCopy,
  onDelete,
}: NodeContextMenuProps) {
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
        <Edit className="h-4 w-4" />
        <span>Редактировать</span>
        <span className="ml-auto text-xs tracking-widest text-muted-foreground">
          Enter
        </span>
      </div>

      <div className="-mx-1 my-1 h-px bg-border" />

      <div
        className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        onClick={onCopy}
      >
        <Clipboard className="h-4 w-4" />
        <span>Копировать</span>
        <span className="ml-auto text-xs tracking-widest text-muted-foreground">
          Ctrl+C
        </span>
      </div>

      <div
        className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        onClick={onClone}
      >
        <Copy className="h-4 w-4" />
        <span>Клонировать</span>
        <span className="ml-auto text-xs tracking-widest text-muted-foreground">
          Ctrl+D
        </span>
      </div>

      <div className="-mx-1 my-1 h-px bg-border" />

      <div
        className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none text-red-600 hover:bg-red-50 hover:text-red-600"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
        <span>Удалить</span>
        <span className="ml-auto text-xs tracking-widest text-muted-foreground">
          Delete
        </span>
      </div>
    </div>
  )
}
