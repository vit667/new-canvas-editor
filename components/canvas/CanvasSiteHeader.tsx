"use client"

import { PanelLeftIcon, Plus, Edit, Copy, Trash2, Download, Upload, RotateCcw, Layers, Workflow, Table2, Network, Group, ArrowLeftRight, Server, Image, FileCode, Database } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import ThemeSwitch from "@/components/layout/header/theme-switch"
import UserMenu from "@/components/layout/header/user-menu"
import { ThemeCustomizerPanel } from "@/components/theme-customizer"
import { useCanvasToolbarStore } from "@/store/canvasToolbarStore"
import { useProjectsStore } from "@/store/projectsStore"

export function CanvasSiteHeader() {
  const { toggleSidebar } = useSidebar()
  const { selectedNode, selectedEdge, nodesCount, isConnected, actions } = useCanvasToolbarStore()
  const { getCurrentProject, setViewMode } = useProjectsStore()
  const currentProject = getCurrentProject()

  return (
    <header className="bg-background/40 sticky top-0 z-50 flex h-(--header-height) shrink-0 items-center gap-1 border-b backdrop-blur-md transition-[width,height] ease-linear md:rounded-tl-xl md:rounded-tr-xl">
      <div className="flex w-full items-center gap-1 px-3">
        {/* Sidebar toggle */}
        <Button onClick={toggleSidebar} size="icon" variant="ghost" className="h-8 w-8">
          <PanelLeftIcon className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />

        {/* Название проекта */}
        <span className="text-sm font-semibold truncate max-w-[180px]">
          {currentProject?.name ?? "Canvas Editor"}
        </span>

        {/* Переключатель режима */}
        {currentProject && (
          <>
            <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
            <div className="flex items-center gap-0.5">
              <Button
                size="icon"
                variant={currentProject.viewMode === 'canvas' ? 'default' : 'ghost'}
                onClick={() => setViewMode('canvas')}
                title="Canvas"
                className="h-7 w-7"
              >
                <Workflow className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant={currentProject.viewMode === 'table' ? 'default' : 'ghost'}
                onClick={() => setViewMode('table')}
                title="Таблица"
                className="h-7 w-7"
              >
                <Table2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant={currentProject.viewMode === 'cmdb' ? 'default' : 'ghost'}
                onClick={() => setViewMode('cmdb')}
                title="CMDB"
                className="h-7 w-7"
              >
                <Database className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}

        {/* Canvas toolbar (только в режиме canvas) */}
        {currentProject?.viewMode === 'canvas' && actions && (
          <>
            <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
            <div className="flex items-center gap-0.5">
              <Button onClick={actions.addNewNode} size="icon" variant="outline" title="Добавить узел" className="h-7 w-7">
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button onClick={actions.addNewGroup} size="icon" variant="outline" title="Добавить группу" className="h-7 w-7">
                <Layers className="h-3.5 w-3.5" />
              </Button>
              <Button onClick={actions.addNewTrackedNode} size="icon" variant="outline" title="Отслеживаемый узел" className="h-7 w-7">
                <Network className="h-3.5 w-3.5" />
              </Button>
              <Button onClick={actions.addNewTrackedGroup} size="icon" variant="outline" title="Отслеживаемая группа" className="h-7 w-7">
                <Group className="h-3.5 w-3.5" />
              </Button>
              <Button onClick={actions.addNewEquipmentNode} size="icon" variant="outline" title="Оборудование" className="h-7 w-7">
                <Server className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Действия над выделенным узлом */}
            {selectedNode && (
              <>
                <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
                <div className="flex items-center gap-0.5">
                  <Button onClick={actions.openEditor} size="icon" variant="default" title="Редактировать" className="h-7 w-7">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button onClick={actions.cloneSelectedNode} size="icon" variant="default" title="Клонировать" className="h-7 w-7">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button onClick={actions.deleteSelectedNode} size="icon" variant="destructive" title="Удалить" className="h-7 w-7">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}

            {/* Действия над выделенным edge */}
            {selectedEdge && (
              <>
                <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
                <Button onClick={actions.openEdgeEditor} size="icon" variant="default" title="Настроить связь" className="h-7 w-7">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </Button>
              </>
            )}

            <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
            <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
              {nodesCount} узл.
            </span>

            <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-0.5">
              <Button onClick={actions.handleExport} size="icon" variant="ghost" title="Экспорт JSON" className="h-7 w-7">
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button onClick={actions.handleExportImage} size="icon" variant="ghost" title="Экспорт PNG" className="h-7 w-7">
                <Image className="h-3.5 w-3.5" />
              </Button>
              <Button onClick={actions.handleExportHTML} size="icon" variant="ghost" title="Экспорт HTML" className="h-7 w-7">
                <FileCode className="h-3.5 w-3.5" />
              </Button>
              <Button onClick={actions.handleImportClick} size="icon" variant="ghost" title="Импорт" className="h-7 w-7">
                <Upload className="h-3.5 w-3.5" />
              </Button>
              <Button onClick={actions.handleClearCanvas} size="icon" variant="ghost" title="Очистить" className="h-7 w-7">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}

        {/* Правая часть: theme, user */}
        <div className="ml-auto flex items-center gap-1">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-green-500' : 'bg-red-400'}`}
            title={isConnected ? 'WS подключено' : 'WS не подключено'}
          />
          <ThemeSwitch />
          <ThemeCustomizerPanel />
          <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
