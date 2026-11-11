"use client"

import { useProjectsStore } from "@/store/projectsStore"
import CanvasEditor, { type CanvasEditorRef } from "@/components/canvas/CanvasEditor"
import { TableView } from "@/components/canvas/TableView"
import { CMDBView } from "@/components/canvas/CMDBView"
import { useEffect, useRef, useCallback } from "react"
import type { Node, Edge } from "reactflow"
import { useWebSocketSync } from "@/hooks/useWebSocketSync"
import { useCanvasToolbarStore } from "@/store/canvasToolbarStore"

/**
 * Только canvas-контент (без sidebar/header — они в CanvasApp).
 * Регистрирует canvasRef actions в canvasToolbarStore чтобы
 * CanvasSiteHeader мог вызывать их.
 */
export default function CanvasWithProjects() {
  const { projects, currentProjectId, getCurrentProject, createProject, updateCurrentProject } = useProjectsStore()
  const currentProject = getCurrentProject()
  const canvasRef = useRef<CanvasEditorRef>(null)

  const { syncProject, isConnected } = useWebSocketSync(true)
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncProjectRef = useRef(syncProject)
  useEffect(() => { syncProjectRef.current = syncProject }, [syncProject])

  const {
    setSelectedNode,
    setSelectedEdge,
    setNodesCount,
    setIsConnected,
    setActions,
  } = useCanvasToolbarStore()

  // Создаём первый проект если их нет
  useEffect(() => {
    if (projects.length === 0) createProject("Мой первый проект")
  }, [])

  // Обновляем isConnected в toolbar store
  useEffect(() => {
    setIsConnected(isConnected)
  }, [isConnected, setIsConnected])

  // Опрашиваем selectedNode/Edge и nodesCount через интервал
  useEffect(() => {
    const interval = setInterval(() => {
      const node = canvasRef.current?.getSelectedNode() ?? null
      const edge = canvasRef.current?.getSelectedEdge() ?? null
      const count = canvasRef.current?.getNodesCount() ?? (currentProject?.nodes.length ?? 0)
      setSelectedNode(node)
      setSelectedEdge(edge)
      setNodesCount(count)
    }, 100)
    return () => clearInterval(interval)
  }, [currentProjectId, setSelectedNode, setSelectedEdge, setNodesCount])

  // Регистрируем actions canvasRef в store (обновляем при смене проекта)
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
    return () => setActions(null)
  }, [currentProjectId, setActions])

  // Синхронизация canvas → store
  const handleStateChange = useCallback((nodes: Node[], edges: Edge[]) => {
    updateCurrentProject(nodes, edges)
    if (currentProjectId) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
      syncTimeoutRef.current = setTimeout(() => {
        const project = getCurrentProject()
        if (project) syncProjectRef.current(currentProjectId, nodes, edges, project.viewMode)
      }, 500)
    }
  }, [updateCurrentProject, currentProjectId, getCurrentProject])

  // Синхронизация при смене viewMode
  useEffect(() => {
    if (currentProjectId && currentProject) {
      syncProjectRef.current(currentProjectId, currentProject.nodes, currentProject.edges, currentProject.viewMode)
    }
  }, [currentProject?.viewMode, currentProjectId])

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center flex-1">
        <p className="text-muted-foreground">Выберите проект или создайте новый</p>
      </div>
    )
  }

  if (currentProject.viewMode === 'canvas') {
    return (
      <CanvasEditor
        ref={canvasRef}
        key={currentProject.id}
        initialNodes={currentProject.nodes}
        initialEdges={currentProject.edges}
        onStateChange={handleStateChange}
        blueprint={currentProject.canvasStyle === 'blueprint'}
      />
    )
  }

  if (currentProject.viewMode === 'table') {
    return (
      <div className="absolute inset-0 overflow-auto">
        <TableView nodes={currentProject.nodes} edges={currentProject.edges} />
      </div>
    )
  }

  return (
    <div className="absolute inset-0 overflow-auto">
      <CMDBView />
    </div>
  )
}
