"use client"

import Link from "next/link"
import {
  ArrowLeftRight,
  Boxes,
  Copy,
  Download,
  Edit,
  FileCode,
  Grid3x3,
  Image,
  Layers,
  MoreHorizontal,
  Network,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCanvasToolbarStore } from "@/store/canvasToolbarStore"
import { useProjectsStore } from "@/store/projectsStore"
import { inventoryHref } from "@/lib/navigation"

/** Инструменты холста в шапке (страница /schemes/[id]) */
export function SchemeToolbar({ projectId }: { projectId: string }) {
  const { selectedNode, selectedEdge, nodesCount, isConnected, actions } = useCanvasToolbarStore()
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId))
  const setCanvasStyle = useProjectsStore((s) => s.setCanvasStyle)
  const setCurrentProject = useProjectsStore((s) => s.setCurrentProject)
  if (!actions || !project) return null

  const blueprint = project.canvasStyle === "blueprint"
  const icon = "h-3.5 w-3.5"

  return (
    <div className="flex items-center gap-1.5">
      <ButtonGroup>
        <Button onClick={() => actions.addNewNode()} size="sm" variant="outline" className="h-8 gap-1.5">
          <Plus className={icon} /> Узел
        </Button>
        <Button onClick={() => actions.addNewGroup()} size="icon-sm" variant="outline" title="Группа" className="h-8">
          <Layers className={icon} />
        </Button>
        <Button onClick={() => actions.addNewTrackedNode()} size="icon-sm" variant="outline" title="Отслеживаемый узел" className="h-8">
          <Network className={icon} />
        </Button>
      </ButtonGroup>

      {selectedNode && (
        <ButtonGroup>
          <Button onClick={() => actions.openEditor()} size="icon-sm" variant="outline" title="Редактировать" className="h-8">
            <Edit className={icon} />
          </Button>
          <Button onClick={() => actions.cloneSelectedNode()} size="icon-sm" variant="outline" title="Клонировать" className="h-8">
            <Copy className={icon} />
          </Button>
          <Button onClick={() => actions.deleteSelectedNode()} size="icon-sm" variant="outline" title="Удалить" className="text-destructive h-8">
            <Trash2 className={icon} />
          </Button>
        </ButtonGroup>
      )}
      {selectedEdge && (
        <Button onClick={() => actions.openEdgeEditor()} size="sm" variant="outline" title="Настроить связь" className="h-8 gap-1.5">
          <ArrowLeftRight className={icon} /> Связь
        </Button>
      )}

      <Separator orientation="vertical" className="mx-0.5 data-[orientation=vertical]:h-5" />

      <Button
        onClick={() => {
          // setCanvasStyle работает с «текущей» схемой — делаем её текущей
          setCurrentProject(projectId)
          setCanvasStyle(blueprint ? "default" : "blueprint")
        }}
        size="icon-sm"
        variant={blueprint ? "secondary" : "ghost"}
        title={blueprint ? "Светлая схема" : "Тёмная схема (blueprint)"}
        className="h-8"
      >
        <Grid3x3 className={icon} />
      </Button>
      <Button asChild size="sm" variant="ghost" className="h-8 gap-1.5" title="Объекты этой схемы в реестре">
        <Link href={inventoryHref("devices", { scheme: projectId })}>
          <Boxes className={icon} /> <span className="hidden xl:inline">В реестре</span>
        </Link>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" title="Ещё" className="h-8">
            <MoreHorizontal className={icon} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-muted-foreground flex items-center justify-between text-xs font-normal">
            <span>{nodesCount} узлов</span>
            <span className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-400"}`} />
              {isConnected ? "синхр. включена" : "синхр. нет"}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => actions.handleExportImage()}>
            <Image /> Экспорт PNG
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => actions.handleExportHTML()}>
            <FileCode /> Экспорт HTML
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => actions.handleExport()}>
            <Download /> Экспорт JSON
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => actions.handleImportClick()}>
            <Upload /> Импорт JSON
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => actions.handleClearCanvas()}>
            <RotateCcw /> Очистить схему
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
