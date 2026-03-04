import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge } from 'reactflow';

interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  addNode: (node: Node) => void;
  updateNode: (id: string, data: any) => void;
  deleteNode: (id: string) => void;
  clearCanvas: () => void;
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set) => ({
      nodes: [],
      edges: [],

      setNodes: (nodes) => {
        const normalizedNodes = (typeof nodes === 'function' ? nodes([]) : nodes).map((node) => ({
          ...node,
          // Устанавливаем zIndex если его нет: узлы выше групп
          zIndex: node.zIndex ?? (node.type === 'group' ? 1 : 10),
        }));
        set((state) => ({
          nodes: typeof nodes === 'function' 
            ? nodes(state.nodes).map((node) => ({
                ...node,
                zIndex: node.zIndex ?? (node.type === 'group' ? 1 : 10),
              }))
            : normalizedNodes,
        }));
      },

      setEdges: (edges) => {
        const normalizedEdges = (typeof edges === 'function' ? edges([]) : edges).map((edge) => ({
          ...edge,
          // Устанавливаем zIndex если его нет: связи на уровне узлов
          zIndex: edge.zIndex ?? 10,
        }));
        set((state) => ({
          edges: typeof edges === 'function'
            ? edges(state.edges).map((edge) => ({
                ...edge,
                zIndex: edge.zIndex ?? 10,
              }))
            : normalizedEdges,
        }));
      },

      addNode: (node) => {
        // Устанавливаем zIndex: узлы выше групп
        const nodeWithZIndex = {
          ...node,
          zIndex: node.type === 'group' ? 1 : 10,
        };
        set((state) => ({
          nodes: [...state.nodes, nodeWithZIndex],
        }));
      },

      updateNode: (id, data) =>
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id ? { ...node, data: { ...node.data, ...data } } : node
          ),
        })),

      deleteNode: (id) =>
        set((state) => {
          // Находим удаляемую группу
          const deletedNode = state.nodes.find((n) => n.id === id);
          // Если удаляется группа, освобождаем все дочерние узлы
          const updatedNodes = state.nodes
            .filter((node) => node.id !== id)
            .map((node) => {
              if (node.parentId === id) {
                // Вычисляем абсолютную позицию
                const absoluteX = (deletedNode?.position.x || 0) + (node.position.x || 0);
                const absoluteY = (deletedNode?.position.y || 0) + (node.position.y || 0);
                return {
                  ...node,
                  parentId: undefined,
                  position: {
                    x: absoluteX,
                    y: absoluteY,
                  },
                  extent: undefined,
                };
              }
              return node;
            });
          
          return {
            nodes: updatedNodes,
            edges: state.edges.filter(
              (edge) => edge.source !== id && edge.target !== id
            ),
          };
        }),

      clearCanvas: () => set({ nodes: [], edges: [] }),
    }),
    {
      name: 'canvas-storage',
    }
  )
);
