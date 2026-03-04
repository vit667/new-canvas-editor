import {
  Plus,
  Layers,
  Network,
  Server,
  Clipboard,
} from "lucide-react"

interface CanvasContextMenuProps {
  position: { x: number; y: number }
  onAddNode: () => void
  onAddGroup: () => void
  onAddTrackedNode: () => void
  onAddTrackedGroup: () => void
  onAddEquipmentNode: () => void
  onPaste: () => void
  hasClipboard: boolean
}

export function CanvasContextMenu({
  position,
  onAddNode,
  onAddGroup,
  onAddTrackedNode,
  onAddTrackedGroup,
  onAddEquipmentNode,
  onPaste,
  hasClipboard,
}: CanvasContextMenuProps) {
  return (
    <div
      data-context-menu
      className="fixed z-50 min-w-[14rem] overflow-hidden rounded-md border bg-white p-1 text-gray-900 shadow-lg animate-in fade-in-0 zoom-in-95"
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        onClick={onAddNode}
      >
        <Plus className="h-4 w-4" />
        <span>Добавить узел</span>
      </div>

      <div
        className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        onClick={onAddGroup}
      >
        <Layers className="h-4 w-4" />
        <span>Добавить группу</span>
      </div>

      <div className="-mx-1 my-1 h-px bg-border" />

      <div
        className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        onClick={onAddTrackedNode}
      >
        <Network className="h-4 w-4" />
        <span>Отслеживаемый узел</span>
      </div>

      <div
        className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        onClick={onAddTrackedGroup}
      >
        <Network className="h-4 w-4" />
        <span>Отслеживаемая группа</span>
      </div>

      <div className="-mx-1 my-1 h-px bg-border" />

      <div
        className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        onClick={onAddEquipmentNode}
      >
        <Server className="h-4 w-4" />
        <span>Оборудование</span>
      </div>

      <div className="-mx-1 my-1 h-px bg-border" />

      <div
        className={`flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none ${
          hasClipboard
            ? "hover:bg-accent hover:text-accent-foreground"
            : "opacity-50 pointer-events-none"
        }`}
        onClick={hasClipboard ? onPaste : undefined}
      >
        <Clipboard className="h-4 w-4" />
        <span>Вставить</span>
        <span className="ml-auto text-xs tracking-widest text-muted-foreground">
          Ctrl+V
        </span>
      </div>
    </div>
  )
}
