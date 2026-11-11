import type { Edge } from 'reactflow';
import type { InventoryLookups } from './views';

/**
 * Занятость портов узла «Коммутатор» на холсте:
 *   busy   — к порту уже идёт связь на этой схеме (второй кабель нельзя);
 *   remote — порт подключён по данным реестра (другая схема), здесь связи нет;
 *   off    — порт отмечен свободным/выключенным;
 *   free   — свободен.
 */
export type PortState = 'free' | 'busy' | 'remote' | 'off';

export interface PortStatus {
  state: PortState;
  /** С чем соединён (для подсказки) */
  peer?: string;
}

const portOf = (handle?: string | null) =>
  handle?.startsWith('port-') ? handle.replace(/^port-/, '').replace(/-(far-)?(source|target)$/, '') : undefined;

/** Порты узла, к которым идут связи на этой схеме: portId → id противоположного узла */
export function localPortUse(nodeId: string, edges: Edge[]): Map<string, string> {
  const used = new Map<string, string>();
  for (const e of edges) {
    if (e.source === nodeId) {
      const p = portOf(e.sourceHandle);
      if (p) used.set(p, e.target);
    }
    if (e.target === nodeId) {
      const p = portOf(e.targetHandle);
      if (p) used.set(p, e.source);
    }
  }
  return used;
}

export function portStatuses(
  ports: { id: string; entityId?: string; disabled?: boolean }[],
  local: Map<string, string>,
  lk: InventoryLookups | null,
  nodeLabel: (nodeId: string) => string
): Map<string, PortStatus> {
  const out = new Map<string, PortStatus>();
  for (const p of ports) {
    const here = local.get(p.id);
    if (here) {
      out.set(p.id, { state: 'busy', peer: nodeLabel(here) });
      continue;
    }
    const remote = p.entityId && lk ? lk.peerOf(p.entityId) : undefined;
    if (remote) {
      out.set(p.id, { state: 'remote', peer: lk!.label(remote.id) });
      continue;
    }
    out.set(p.id, { state: p.disabled ? 'off' : 'free' });
  }
  return out;
}

export { portOf as portIdOfHandle };
