import { useEffect, useRef } from 'react';
import { useProjectsStore, type CanvasProject } from '@/store/projectsStore';
import type { Node, Edge } from 'reactflow';

// Функция для получения WebSocket URL
const getWebSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  // Используем прокси через Vite - относительный путь
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
};

interface WebSocketMessage {
  type: 'state' | 'project_updated' | 'project_created' | 'project_deleted' | 'project_renamed' | 'error';
  data?: unknown;
  requestId?: string;
  error?: string;
}

export function useWebSocketSync(enabled: boolean = true) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);

  const {
    projects,
    currentProjectId,
    setCurrentProject,
  } = useProjectsStore();

  // Функция для отправки сообщения
  const sendMessage = (message: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  // Функция для подключения
  const connect = () => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        
        // Запрашиваем полную синхронизацию при подключении
        if (!isInitializedRef.current) {
          sendMessage({ type: 'sync_all' });
          isInitializedRef.current = true;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'state': {
              // Получаем полное состояние от сервера
              const serverData = message.data as { projects?: CanvasProject[] };
              if (serverData?.projects) {
                // Обновляем локальное хранилище с данными сервера
                // Убираем дубликаты по ID
                const serverProjects = serverData.projects || [];
                const uniqueProjects = serverProjects.filter((project: CanvasProject, index: number, self: CanvasProject[]) =>
                  index === self.findIndex((p: CanvasProject) => p.id === project.id)
                );
                
                useProjectsStore.setState({
                  projects: uniqueProjects,
                });

                // Если текущий проект был удален на сервере, выбираем первый доступный
                if (currentProjectId && !uniqueProjects.find((p: CanvasProject) => p.id === currentProjectId)) {
                  if (uniqueProjects.length > 0) {
                    setCurrentProject(uniqueProjects[0].id);
                  }
                }
              }
              break;
            }

            case 'project_updated': {
              const data = message.data as { projectId: string; nodes: Node[]; edges: Edge[]; viewMode?: 'canvas' | 'table' | 'cmdb' };
              const { projectId, nodes, edges, viewMode } = data;
              
              // Обновляем только если это не текущий проект (чтобы избежать циклов)
              // Или если это другой пользователь обновил
              if (projectId !== currentProjectId) {
                const project = projects.find(p => p.id === projectId);
                if (project) {
                  useProjectsStore.setState({
                    projects: projects.map(p =>
                      p.id === projectId
                        ? { ...p, nodes, edges, viewMode: viewMode || p.viewMode, updatedAt: Date.now() }
                        : p
                    ),
                  });
                }
              }
              break;
            }

            case 'project_created': {
              const newProject = message.data as CanvasProject;
              
              // Добавляем проект, если его еще нет (проверяем на дубликаты)
              if (newProject && newProject.id) {
                const existingProject = projects.find(p => p.id === newProject.id);
                if (!existingProject) {
                  // Убеждаемся, что нет дубликатов перед добавлением
                  const uniqueProjects = projects.filter((p: CanvasProject, index: number, self: CanvasProject[]) =>
                    index === self.findIndex((proj: CanvasProject) => proj.id === p.id)
                  );
                  useProjectsStore.setState({
                    projects: [...uniqueProjects, newProject],
                  });
                }
              }
              break;
            }

            case 'project_deleted': {
              const data = message.data as { projectId: string };
              const { projectId } = data;
              
              // Удаляем проект
              const newProjects = projects.filter(p => p.id !== projectId);
              useProjectsStore.setState({
                projects: newProjects,
              });

              // Если удален текущий проект, выбираем другой
              if (currentProjectId === projectId && newProjects.length > 0) {
                setCurrentProject(newProjects[0].id);
              }
              break;
            }

            case 'project_renamed': {
              const data = message.data as { projectId: string; name: string };
              const { projectId, name } = data;
              
              useProjectsStore.setState({
                projects: projects.map(p =>
                  p.id === projectId
                    ? { ...p, name, updatedAt: Date.now() }
                    : p
                ),
              });
              break;
            }

            case 'error': {
              console.error('WebSocket error:', message.data);
              break;
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        wsRef.current = null;

        // Переподключение через 3 секунды
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };
    } catch (error) {
      console.error('Error connecting WebSocket:', error);
    }
  };

  // Функция для отправки обновления проекта
  const syncProject = (projectId: string, nodes: Node[], edges: Edge[], viewMode?: 'canvas' | 'table' | 'cmdb') => {
    sendMessage({
      type: 'update_project',
      data: { projectId, nodes, edges, viewMode },
    });
  };

  // Функция для создания проекта
  const createProject = (projectId: string, name: string) => {
    sendMessage({
      type: 'create_project',
      data: { projectId, name },
    });
  };

  // Функция для удаления проекта
  const deleteProject = (projectId: string) => {
    sendMessage({
      type: 'delete_project',
      data: { projectId },
    });
  };

  // Функция для переименования проекта
  const renameProject = (projectId: string, name: string) => {
    sendMessage({
      type: 'rename_project',
      data: { projectId, name },
    });
  };

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    syncProject,
    createProject,
    deleteProject,
    renameProject,
  };
}

