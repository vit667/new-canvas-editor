"use client"

import { useCallback, useEffect, useRef } from "react"
import type { Edge, Node } from "reactflow"
import CanvasEditor, { type CanvasEditorRef } from "@/components/canvas/CanvasEditor"
import { useProjectsStore } from "@/store/projectsStore"
import { useCanvasToolbarStore } from "@/store/canvasToolbarStore"
import { useWebSocketSync } from "@/hooks/useWebSocketSync"
import { useDiagramInventorySync } from "@/hooks/useInventorySync"

/**
 * Редактор одной схемы (страница /schemes/[id]).
 * Регистрирует действия холста в canvasToolbarStore — их показывает шапка оболочки.
 */
export default function SchemeCanvas({ projectId }: { projectId: string }) {
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId))
  const updateProjectGraph = useProjectsStore((s) => s.updateProjectGraph)
  const canvasRef = useRef<CanvasEditorRef>(null)
  const onDiagramChange = useDiagramInventorySync(project ? projectId : null)

  const { syncProject, isConnected } = useWebSocketSync(true)
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncProjectRef = useRef(syncProject)
  useEffect(() => {
    syncProjectRef.current = syncProject
  }, [syncProject])

  const { setSelectedNode, setSelectedEdge, setNodesCount, setIsConnected, setActions } = useCanvasToolbarStore()

  useEffect(() => setIsConnected(isConnected), [isConnected, setIsConnected])

  // Выделение и число узлов — для кнопок шапки
  useEffect(() => {
    const interval = setInterval(() => {
      setSelectedNode(canvasRef.current?.getSelectedNode() ?? null)
      setSelectedEdge(canvasRef.current?.getSelectedEdge() ?? null)
      setNodesCount(canvasRef.current?.getNodesCount() ?? 0)
    }, 100)
    return () => clearInterval(interval)
  }, [projectId, setSelectedNode, setSelectedEdge, setNodesCount])

  useEffect(() => {
    setActions({
      addNewNode: () => canvasRef.current?.addNewNode(),
      addNewGroup: () => canvasRef.current?.addNewGroup(),
      addNewTrackedNode: () => canvasRef.current?.addNewTrackedNode(),
      addNewTrackedGroup: () => canvasRef.current?.addNewTrackedGroup(),
      addNewEquipmentNode: () => canvasRef.current?.addNewEquipmentNode(),
      openEditor: () => canvasRef.current?.openEditor(),
      cloneSelectedNode: () => canvasRef.current?.cloneSelectedNode(),
      deleteSelectedNode: () => canvasRef.current?.deleteSelectedNode(),
      openEdgeEditor: () => canvasRef.current?.openEdgeEditor(),
      handleExport: () => canvasRef.current?.handleExport(),
      handleExportImage: () => canvasRef.current?.handleExportImage(),
      handleExportHTML: () => canvasRef.current?.handleExportHTML(),
      handleImportClick: () => canvasRef.current?.handleImportClick(),
      handleClearCanvas: () => canvasRef.current?.handleClearCanvas(),
      getNodesCount: () => canvasRef.current?.getNodesCount() ?? 0,
      focusNode: (nodeId: string) => canvasRef.current?.focusNode(nodeId),
    })
    return () => {
      setActions(null)
      setSelectedNode(null)
      setSelectedEdge(null)
    }
  }, [projectId, setActions, setSelectedNode, setSelectedEdge])

  // Фокус на узле из ссылки ?node=… (переход из реестра «показать на схеме»)
  useEffect(() => {
    const nodeId = new URLSearchParams(window.location.search).get("node")
    if (!nodeId) return
    const t = setTimeout(() => canvasRef.current?.focusNode(nodeId), 500)
    return () => clearTimeout(t)
  }, [projectId])

  const handleStateChange = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      updateProjectGraph(projectId, nodes, edges)
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
      syncTimeoutRef.current = setTimeout(() => {
        const p = useProjectsStore.getState().projects.find((x) => x.id === projectId)
        if (p) syncProjectRef.current(projectId, nodes, edges, p.viewMode)
      }, 500)
      onDiagramChange(nodes, edges)
    },
    [projectId, updateProjectGraph, onDiagramChange]
  )

  if (!project) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
        Схема не найдена
      </div>
    )
  }

  return (
    <CanvasEditor
      ref={canvasRef}
      key={project.id}
      initialNodes={project.nodes}
      initialEdges={project.edges}
      onStateChange={handleStateChange}
      blueprint={project.canvasStyle === "blueprint"}
    />
  )
}
