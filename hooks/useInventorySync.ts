"use client"

import { useCallback, useEffect, useRef } from 'react';
import type { Edge, Node } from 'reactflow';
import { getInventory } from '@/lib/inventory/local-adapter';
import { applyEntitiesToNodes, applyPatches, syncDiagram } from '@/lib/inventory/diagram-sync';
import { useProjectsStore } from '@/store/projectsStore';
import { useCanvasStore } from '@/store/canvasStore';

const DEBOUNCE_MS = 400;

/**
 * Какая схема сейчас открыта в редакторе. Её узлы живут в canvasStore,
 * остальные — только в projectsStore.
 */
let mountedCanvasProjectId: string | null = null;
export function setMountedCanvas(projectId: string | null) {
  mountedCanvasProjectId = projectId;
}

/** Перенести изменённые объекты реестра на все схемы, где они нарисованы */
function propagate(changedIds: string[], exceptProjectId?: string) {
  if (!changedIds.length) return;
  const repo = getInventory();
  const changed = new Set(changedIds);
  const { projects, setProjectNodes } = useProjectsStore.getState();
  for (const p of projects) {
    if (p.id === exceptProjectId) continue;
    if (p.id === mountedCanvasProjectId) {
      // Открытая схема: правим холст, проект обновится сам через onStateChange
      const { nodes, setNodes } = useCanvasStore.getState();
      const next = applyEntitiesToNodes(repo, nodes, changed);
      if (next) setNodes(next);
      continue;
    }
    const next = applyEntitiesToNodes(repo, p.nodes, changed);
    if (next) setProjectNodes(p.id, next);
  }
}

/**
 * Фон на всё приложение (ставится в оболочке):
 * - один раз переносит все схемы в реестр (узлы получают entityId);
 * - правки реестра не со схем (таблицы реестра, импорт) разносит по схемам.
 */
export function useInventoryBackgroundSync() {
  const migrated = useRef(false);

  useEffect(() => {
    if (migrated.current) return;
    migrated.current = true;
    const repo = getInventory();
    const { projects, setProjectNodes } = useProjectsStore.getState();
    let bound = 0;
    for (const p of projects) {
      const res = syncDiagram(repo, p.id, p.nodes, p.edges);
      if (Object.keys(res.patches).length) {
        setProjectNodes(p.id, applyPatches(p.nodes, res.patches));
        bound += Object.keys(res.patches).length;
      }
      res.issues.filter((i) => i.level === 'error').forEach((i) => console.warn(`[inventory] ${p.name}: ${i.message}`));
    }
    if (bound) console.info(`[inventory] связано с реестром узлов: ${bound}`);
  }, []);

  useEffect(
    () =>
      getInventory().subscribe((e) => {
        if (!e.origin.startsWith('diagram:')) propagate(e.changedIds);
      }),
    []
  );
}

/** Открытая схема → реестр (с задержкой, чтобы не дёргать на каждом кадре перетаскивания) */
export function useDiagramInventorySync(projectId: string | null) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const flush = useCallback(
    (closing = false) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      const job = pending.current;
      pending.current = null;
      if (!job || !projectId) return;
      const res = syncDiagram(getInventory(), projectId, job.nodes, job.edges);
      if (Object.keys(res.patches).length) {
        if (closing) {
          // Схема уже закрывается — вписываем id прямо в проект
          const { projects, setProjectNodes } = useProjectsStore.getState();
          const p = projects.find((x) => x.id === projectId);
          if (p) setProjectNodes(projectId, applyPatches(p.nodes, res.patches));
        } else {
          useCanvasStore.getState().setNodes((cur) => applyPatches(cur, res.patches));
        }
      }
      res.issues.filter((i) => i.level === 'error').forEach((i) => console.warn(`[inventory] ${i.message}`));
      propagate(res.changedIds, projectId);
    },
    [projectId]
  );

  useEffect(() => {
    setMountedCanvas(projectId);
    return () => {
      // Уход со схемы: не теряем отложенную синхронизацию
      setMountedCanvas(null);
      flush(true);
    };
  }, [projectId, flush]);

  return useCallback(
    (nodes: Node[], edges: Edge[]) => {
      if (!projectId) return;
      pending.current = { nodes, edges };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flush(), DEBOUNCE_MS);
    },
    [projectId, flush]
  );
}
