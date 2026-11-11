import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge } from 'reactflow';

export type ViewMode = 'canvas' | 'table' | 'cmdb' | 'inventory';

export interface CanvasProject {
  id: string;
  name: string;
  icon?: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: number;
  updatedAt: number;
  viewMode: ViewMode;
  /** Стиль холста: обычный или тёмный blueprint */
  canvasStyle?: CanvasStyle;
}

export type CanvasStyle = 'default' | 'blueprint';

interface ProjectsState {
  projects: CanvasProject[];
  currentProjectId: string | null;

  // Управление проектами
  createProject: (name: string, icon?: string) => string;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string, icon?: string) => void;
  setCurrentProject: (id: string) => void;

  // Работа с текущим проектом
  getCurrentProject: () => CanvasProject | null;
  updateCurrentProject: (nodes: Node[], edges: Edge[]) => void;
  setViewMode: (mode: ViewMode) => void;
  setCanvasStyle: (style: CanvasStyle) => void;
  /** Заменить узлы любого проекта (миграция в реестр, перенос правок между схемами) */
  setProjectNodes: (id: string, nodes: Node[]) => void;
  /** Сохранить граф конкретной схемы (не «текущей») */
  updateProjectGraph: (id: string, nodes: Node[], edges: Edge[]) => void;
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,

      createProject: (name, icon) => {
        const id = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newProject: CanvasProject = {
          id,
          name,
          icon,
          nodes: [],
          edges: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          viewMode: 'canvas',
        };

        set((state) => {
          // Убираем возможные дубликаты перед добавлением
          const uniqueProjects = state.projects.filter((p, index, self) =>
            index === self.findIndex((proj) => proj.id === p.id)
          );
          
          // Проверяем, что проект с таким ID еще не существует
          if (!uniqueProjects.find(p => p.id === id)) {
            return {
              projects: [...uniqueProjects, newProject],
              currentProjectId: id,
            };
          }
          
          // Если проект уже существует, возвращаем текущее состояние
          return state;
        });

        return id;
      },

      deleteProject: (id) => {
        set((state) => {
          const newProjects = state.projects.filter((p) => p.id !== id);
          const newCurrentId = state.currentProjectId === id
            ? (newProjects[0]?.id || null)
            : state.currentProjectId;

          return {
            projects: newProjects,
            currentProjectId: newCurrentId,
          };
        });
      },

      renameProject: (id, name, icon) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, name, ...(icon !== undefined && { icon }), updatedAt: Date.now() }
              : p
          ),
        }));
      },

      setCurrentProject: (id) => {
        set({ currentProjectId: id });
      },

      getCurrentProject: () => {
        const state = get();
        return state.projects.find((p) => p.id === state.currentProjectId) || null;
      },

      updateCurrentProject: (nodes, edges) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId
              ? { ...p, nodes, edges, updatedAt: Date.now() }
              : p
          ),
        }));
      },

      setViewMode: (mode) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId
              ? { ...p, viewMode: mode, updatedAt: Date.now() }
              : p
          ),
        }));
      },

      updateProjectGraph: (id, nodes, edges) => {
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, nodes, edges, updatedAt: Date.now() } : p)),
        }));
      },

      setProjectNodes: (id, nodes) => {
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, nodes, updatedAt: Date.now() } : p)),
        }));
      },

      setCanvasStyle: (canvasStyle) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === state.currentProjectId
              ? { ...p, canvasStyle, updatedAt: Date.now() }
              : p
          ),
        }));
      },
    }),
    {
      name: 'canvas-projects-storage',
    }
  )
);
