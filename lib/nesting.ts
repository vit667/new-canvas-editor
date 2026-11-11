import type { Node } from 'reactflow';
import { isContainerType } from './blueprint';

/**
 * Перепривязка узлов к контейнерам (group / tracked-group / section) после перетаскивания.
 * - узел попадает в самый маленький контейнер, в котором лежит его центр;
 * - секции можно вкладывать в секции (на любую глубину), без циклов;
 * - позиции пересчитываются через абсолютные координаты, так что вложенность любой глубины
 *   не «прыгает»;
 * - родители всегда идут в массиве раньше детей (требование React Flow).
 */

const DEFAULT_W = 200;
const DEFAULT_H = 100;

export function nodeSize(n: Node): { w: number; h: number } {
  const w = n.width ?? (typeof n.style?.width === 'number' ? n.style.width : undefined) ?? DEFAULT_W;
  const h = n.height ?? (typeof n.style?.height === 'number' ? n.style.height : undefined) ?? DEFAULT_H;
  return { w, h };
}

function absolutePosition(id: string, byId: Map<string, Node>, cache: Map<string, { x: number; y: number }>) {
  const cached = cache.get(id);
  if (cached) return cached;
  const n = byId.get(id);
  if (!n) return { x: 0, y: 0 };
  let pos = { x: n.position.x, y: n.position.y };
  if (n.parentId && byId.has(n.parentId)) {
    const p = absolutePosition(n.parentId, byId, cache);
    pos = { x: p.x + pos.x, y: p.y + pos.y };
  }
  cache.set(id, pos);
  return pos;
}

function isDescendant(candidateId: string, ancestorId: string, byId: Map<string, Node>): boolean {
  let cur = byId.get(candidateId);
  const seen = new Set<string>();
  while (cur?.parentId && !seen.has(cur.id)) {
    if (cur.parentId === ancestorId) return true;
    seen.add(cur.id);
    cur = byId.get(cur.parentId);
  }
  return false;
}

/** Можно ли положить узел в контейнер этого типа */
function canNest(child: Node, container: Node): boolean {
  if (!isContainerType(container.type)) return false;
  if (!isContainerType(child.type)) return true;
  // контейнеры вкладываются только секция → секция
  return child.type === 'section' && container.type === 'section';
}

/** Родители раньше детей; относительный порядок остальных сохраняется */
export function sortParentsFirst(nodes: Node[]): Node[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const depth = (n: Node) => {
    let d = 0;
    let cur = n;
    const seen = new Set<string>();
    while (cur.parentId && byId.has(cur.parentId) && !seen.has(cur.id)) {
      seen.add(cur.id);
      cur = byId.get(cur.parentId)!;
      d++;
    }
    return d;
  };
  return nodes
    .map((n, i) => ({ n, i, d: depth(n) }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .map((x) => x.n);
}

/** Пересчитать родителей для перемещённых узлов */
export function reparentNodes(nodes: Node[], movedIds: Set<string>): Node[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const absCache = new Map<string, { x: number; y: number }>();
  const abs = (id: string) => absolutePosition(id, byId, absCache);

  let changed = false;
  const result = nodes.map((node) => {
    if (!movedIds.has(node.id)) return node;

    const pos = abs(node.id);
    const { w, h } = nodeSize(node);
    const cx = pos.x + w / 2;
    const cy = pos.y + h / 2;

    let best: Node | null = null;
    let bestArea = Infinity;
    for (const c of nodes) {
      if (c.id === node.id || !canNest(node, c) || isDescendant(c.id, node.id, byId)) continue;
      const cp = abs(c.id);
      const { w: cw, h: ch } = nodeSize(c);
      if (cx < cp.x || cx > cp.x + cw || cy < cp.y || cy > cp.y + ch) continue;
      const area = cw * ch;
      if (area < bestArea) {
        best = c;
        bestArea = area;
      }
    }

    const newParent = best?.id;
    if (newParent === node.parentId) return node;

    changed = true;
    const base = best ? abs(best.id) : { x: 0, y: 0 };
    // Старые группы «держат» узлы внутри (как было), секции — нет: из них можно вытащить
    const keepInside = best && (best.type === 'group' || best.type === 'tracked-group');
    return {
      ...node,
      parentId: newParent,
      position: { x: pos.x - base.x, y: pos.y - base.y },
      extent: keepInside ? ('parent' as const) : undefined,
    };
  });

  return changed ? sortParentsFirst(result) : result;
}

/** Освободить узлы, чей родитель исчез */
export function releaseOrphans(nodes: Node[]): Node[] {
  const ids = new Set(nodes.map((n) => n.id));
  if (nodes.every((n) => !n.parentId || ids.has(n.parentId))) return nodes;
  return nodes.map((n) =>
    n.parentId && !ids.has(n.parentId)
      ? { ...n, parentId: undefined, extent: undefined, position: n.positionAbsolute ?? n.position }
      : n
  );
}

/** Абсолютная позиция узла с учётом вложенности (positionAbsolute в сохранённых узлах может не быть) */
export function absolutePositionOf(node: Node, nodes: Node[]): { x: number; y: number } {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let x = node.position.x;
  let y = node.position.y;
  const seen = new Set<string>([node.id]);
  let parent = node.parentId ? byId.get(node.parentId) : undefined;
  while (parent && !seen.has(parent.id)) {
    seen.add(parent.id);
    x += parent.position.x;
    y += parent.position.y;
    parent = parent.parentId ? byId.get(parent.parentId) : undefined;
  }
  return { x, y };
}
