"use client"

import { create } from 'zustand'
import type { Node, Edge } from 'reactflow'

export interface CanvasActions {
  addNewNode: () => void
  addNewGroup: () => void
  addNewTrackedNode: () => void
  addNewTrackedGroup: () => void
  addNewEquipmentNode: () => void
  openEditor: () => void
  cloneSelectedNode: () => void
  deleteSelectedNode: () => void
  openEdgeEditor: () => void
  handleExport: () => void
  handleExportImage: () => void
  handleExportHTML: () => void
  handleImportClick: () => void
  handleClearCanvas: () => void
  getNodesCount: () => number
  focusNode: (nodeId: string) => void
}

interface CanvasToolbarStore {
  selectedNode: Node | null
  selectedEdge: Edge | null
  nodesCount: number
  isConnected: boolean
  actions: CanvasActions | null
  setSelectedNode: (node: Node | null) => void
  setSelectedEdge: (edge: Edge | null) => void
  setNodesCount: (n: number) => void
  setIsConnected: (v: boolean) => void
  setActions: (actions: CanvasActions | null) => void
}

export const useCanvasToolbarStore = create<CanvasToolbarStore>((set) => ({
  selectedNode: null,
  selectedEdge: null,
  nodesCount: 0,
  isConnected: false,
  actions: null,
  setSelectedNode: (node) => set({ selectedNode: node }),
  setSelectedEdge: (edge) => set({ selectedEdge: edge }),
  setNodesCount: (n) => set({ nodesCount: n }),
  setIsConnected: (v) => set({ isConnected: v }),
  setActions: (actions) => set({ actions }),
}))
