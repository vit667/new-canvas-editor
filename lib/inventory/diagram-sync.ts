import type { Edge, Node } from 'reactflow';
import { newEntityId, type InventoryRepository } from './repository';
import { isIPv4 } from './validation';
import type { AttrsMap, Change, Entity, EntityInput, EntityKind, Relation, RelationType } from './types';

/**
 * Связка схем (узлы React Flow) с реестром.
 *
 * Схема → реестр (syncDiagram): каждый «предметный» узел получает entityId и становится
 * объектом реестра. Порты коммутатора → интерфейсы, связь порт↔порт → кабель,
 * вложенность секций → «содержит», стек сервисов → ПО «работает на» сервисе,
 * панель «Сети» → VLAN + подсети. Узлы-надписи (легенда, таблица, плитки) не связываются.
 *
 * Реестр → схема (applyEntitiesToNodes): правка объекта переносится на все схемы,
 * где он нарисован.
 *
 * Удаление узла со схемы НЕ удаляет объект из реестра. Удаляются только «детали»
 * узла: его интерфейсы, его IP, кабели и связи, выведенные из этой схемы.
 */

export const BOUND_NODE_TYPES = ['device', 'switch', 'section', 'service', 'cloud', 'external', 'networks'] as const;

/** Что дописать в data узла, чтобы он знал свои id в реестре */
export interface NodePatch {
  entityId?: string;
  ipEntityId?: string | null;
  ports?: Record<string, string>;
  items?: Record<string, string>;
  networks?: Record<string, { entityId: string; prefixEntityId?: string }>;
}

export interface SyncResult {
  patches: Record<string, NodePatch>;
  changedIds: string[];
  issues: { level: string; message: string }[];
}

type Data = Record<string, any>;

const portIdFromHandle = (handle?: string | null) =>
  handle?.startsWith('port-') ? handle.replace(/^port-/, '').replace(/-(far-)?(source|target)$/, '') : undefined;
const extItemFromHandle = (handle?: string | null) =>
  handle?.startsWith('ext-') ? handle.replace(/^ext-/, '').replace(/-(left|right)-(source|target)$/, '') : undefined;

const vidFromTag = (tag?: string) => {
  const m = tag?.match(/(\d{1,4})/);
  return m ? Number(m[1]) : undefined;
};

/** Ключи, за которые отвечает схема: пустое значение в узле очищает поле в реестре */
function mergeAttrs<T extends object>(prev: T | undefined, owned: Partial<T>): T {
  const out: Record<string, unknown> = { ...(prev || {}) };
  for (const [k, v] of Object.entries(owned)) {
    if (v === undefined || v === '' || v === null) delete out[k];
    else out[k] = v;
  }
  return out as T;
}

function withRef(prevSource: Entity['source'] | Relation['source'], projectId: string) {
  const refs = new Set(prevSource?.refs || []);
  refs.add(projectId);
  return { type: prevSource?.type ?? ('diagram' as const), refs: [...refs], at: prevSource?.at };
}

export function syncDiagram(repo: InventoryRepository, projectId: string, nodes: Node[], edges: Edge[]): SyncResult {
  const changes: Change[] = [];
  const patches: Record<string, NodePatch> = {};
  const patch = (nodeId: string) => (patches[nodeId] ??= {});

  // Объекты, подготовленные в этом проходе (ещё не в репозитории)
  const staged = new Map<string, Entity | EntityInput>();
  const current = (id?: string) => (id ? (staged.get(id) as Entity | undefined) ?? repo.get(id) : undefined);

  const upsert = <K extends EntityKind>(
    id: string,
    kind: K,
    name: string,
    owned: Partial<AttrsMap[K]>,
    extra?: { description?: string }
  ) => {
    const prev = current(id);
    const sameKind = prev && prev.kind === kind;
    const entity = {
      ...(sameKind ? prev : {}),
      id,
      kind,
      name: name || prev?.name || '',
      ...(extra?.description !== undefined ? { description: extra.description || undefined } : {}),
      attrs: mergeAttrs(sameKind ? (prev!.attrs as AttrsMap[K]) : undefined, owned),
      source: withRef(prev?.source, projectId),
    } as unknown as EntityInput;
    staged.set(id, entity);
    changes.push({ op: 'upsert', entity });
  };

  const ensureId = (data: Data, key: string, nodeId: string, patchKey: 'entityId' | 'ipEntityId') => {
    let id = data[key] as string | undefined;
    if (!id) {
      id = newEntityId();
      patch(nodeId)[patchKey] = id;
    }
    return id;
  };

  // --- Сети: локальный id сети на схеме → VLAN в реестре
  const vlanOf = new Map<string, string>();
  for (const n of nodes) {
    if (n.type !== 'networks') continue;
    for (const net of (n.data?.networks as Data[]) || []) {
      const vlanId = net.entityId || newEntityId();
      const needPrefix = !!net.cidr?.trim();
      const prefixId = needPrefix ? net.prefixEntityId || newEntityId() : undefined;
      if (!net.entityId || (needPrefix && !net.prefixEntityId)) {
        (patch(n.id).networks ??= {})[net.id] = { entityId: vlanId, prefixEntityId: prefixId };
      }
      vlanOf.set(net.id, vlanId);
      upsert(vlanId, 'vlan', net.name || net.tag, { vid: vidFromTag(net.tag), color: net.color, tag: net.tag }, { description: net.description });
      if (prefixId) upsert(prefixId, 'prefix', net.cidr.trim(), { cidr: net.cidr.trim(), vlanId });
    }
  }
  const mapVlan = (localId?: string) => (localId ? vlanOf.get(localId) : undefined);

  // --- IP узла (адрес на карточке) → объект ipAddress, «принадлежит» объекту узла
  const syncIp = (n: Node, ownerId: string, address?: string, dnsName?: string, vlanLocal?: string) => {
    const data = n.data as Data;
    const addr = address?.trim();
    if (!addr) {
      if (data.ipEntityId) {
        changes.push({ op: 'delete', id: data.ipEntityId });
        patch(n.id).ipEntityId = null;
      }
      return;
    }
    const ipId = ensureId(data, 'ipEntityId', n.id, 'ipEntityId');
    upsert(ipId, 'ipAddress', addr, { address: addr, assignedToId: ownerId, dnsName: dnsName?.trim(), vlanId: mapVlan(vlanLocal), role: 'primary' });
  };

  // id объекта узла и его частей — для связей
  const entityOfNode = new Map<string, string>();
  const portEntity = new Map<string, string>(); // `${nodeId}|${portId}` → interface
  const itemEntity = new Map<string, string>(); // `${nodeId}|${itemId}` → external/software

  for (const n of nodes) {
    const data = (n.data || {}) as Data;
    switch (n.type) {
      case 'device': {
        const id = ensureId(data, 'entityId', n.id, 'entityId');
        entityOfNode.set(n.id, id);
        upsert(id, 'device', data.label, {
          role: data.role, model: data.model, platform: data.os, hostname: data.hostname, vlanId: mapVlan(data.vlanId), icon: data.icon,
        });
        syncIp(n, id, data.ip, data.hostname, data.vlanId);
        break;
      }
      case 'switch': {
        const id = ensureId(data, 'entityId', n.id, 'entityId');
        entityOfNode.set(n.id, id);
        upsert(id, 'device', data.label, {
          role: data.role || 'switch', model: data.model, platform: data.os, hostname: data.hostname, vlanId: mapVlan(data.vlanId), icon: data.icon,
        });
        syncIp(n, id, data.ip, data.hostname, data.vlanId);
        const keep = new Set<string>();
        ((data.ports as Data[]) || []).forEach((p, i) => {
          let ifId = p.entityId as string | undefined;
          if (!ifId) {
            ifId = newEntityId();
            (patch(n.id).ports ??= {})[p.id] = ifId;
          }
          keep.add(ifId);
          portEntity.set(`${n.id}|${p.id}`, ifId);
          upsert(ifId, 'interface', p.name, {
            deviceId: id,
            type: p.kind === 'sfp' ? 'sfp+' : 'rj45',
            speed: p.speed,
            mode: p.trunk ? 'trunk' : 'access',
            untaggedVlanId: p.trunk ? undefined : mapVlan(p.vlanId),
            enabled: !p.disabled,
            order: i,
          }, { description: p.label });
        });
        // Удалённые со схемы порты — удаляются (это части устройства, которые завела схема)
        for (const iface of repo.list('interface')) {
          if (iface.kind === 'interface' && iface.attrs.deviceId === id && !keep.has(iface.id) && iface.source?.type === 'diagram') {
            changes.push({ op: 'delete', id: iface.id });
          }
        }
        break;
      }
      case 'section': {
        const id = ensureId(data, 'entityId', n.id, 'entityId');
        entityOfNode.set(n.id, id);
        upsert(id, 'group', data.label, {
          role: data.role, subtitle: data.subtitle, tag: data.tag, icon: data.icon, vlanId: mapVlan(data.vlanId), hostname: data.hostname,
        }, { description: data.content });
        syncIp(n, id, data.ip, data.hostname, data.vlanId);
        break;
      }
      case 'service': {
        const id = ensureId(data, 'entityId', n.id, 'entityId');
        entityOfNode.set(n.id, id);
        upsert(id, 'service', data.label, {
          url: data.url, ref: data.badge, subtitle: data.subtitle, lanOnly: data.lanOnly || undefined, icon: data.icon, vlanId: mapVlan(data.vlanId),
        });
        syncIp(n, id, isIPv4(String(data.badgeSub || '')) ? data.badgeSub : undefined, undefined, data.vlanId);
        for (const it of (data.items as Data[]) || []) {
          let swId = it.entityId as string | undefined;
          if (!swId) {
            swId = newEntityId();
            (patch(n.id).items ??= {})[it.id] = swId;
          }
          itemEntity.set(`${n.id}|${it.id}`, swId);
          upsert(swId, 'software', it.name, { product: it.name, url: it.url, icon: it.icon });
        }
        break;
      }
      case 'cloud': {
        const id = ensureId(data, 'entityId', n.id, 'entityId');
        entityOfNode.set(n.id, id);
        upsert(id, 'external', data.label, {
          provider: data.label, note: data.subtitle, icon: data.icon,
          bandwidth: data.down || data.up ? { down: data.down, up: data.up } : undefined,
        });
        break;
      }
      case 'external': {
        for (const it of (data.items as Data[]) || []) {
          let exId = it.entityId as string | undefined;
          if (!exId) {
            exId = newEntityId();
            (patch(n.id).items ??= {})[it.id] = exId;
          }
          itemEntity.set(`${n.id}|${it.id}`, exId);
          upsert(exId, 'external', it.name, { note: it.note, icon: it.icon });
        }
        break;
      }
    }
  }

  // --- Связи, выведенные из этой схемы
  const desiredRel = new Map<string, Relation>();
  const desiredCables = new Set<string>();
  const relate = (type: RelationType, fromId: string, toId: string, props?: Record<string, unknown>) => {
    if (!fromId || !toId || fromId === toId) return;
    const id = `rel:${type}:${fromId}:${toId}`;
    const prev = repo.relation(id);
    desiredRel.set(id, { id, type, fromId, toId, ...(props ? { props } : {}), source: withRef(prev?.source, projectId) });
  };

  for (const n of nodes) {
    const child = entityOfNode.get(n.id);
    const parent = n.parentId ? entityOfNode.get(n.parentId) : undefined;
    if (child && parent) relate('contains', parent, child);
    if (n.type === 'service' && child) {
      for (const it of (n.data?.items as Data[]) || []) {
        const sw = itemEntity.get(`${n.id}|${it.id}`);
        if (sw) relate('runs_on', sw, child);
      }
    }
  }

  const endpoint = (nodeId: string, handle?: string | null) => {
    const port = portIdFromHandle(handle);
    if (port) return { id: portEntity.get(`${nodeId}|${port}`), isInterface: true };
    const item = extItemFromHandle(handle);
    if (item) return { id: itemEntity.get(`${nodeId}|${item}`), isInterface: false };
    return { id: entityOfNode.get(nodeId), isInterface: false };
  };

  for (const e of edges) {
    const a = endpoint(e.source, e.sourceHandle);
    const b = endpoint(e.target, e.targetHandle);
    if (!a.id || !b.id) continue;
    const d = (e.data || {}) as Data;
    if (a.isInterface && b.isInterface) {
      const [x, y] = [a.id, b.id].sort();
      const cableId = `cable:${x}:${y}`;
      desiredCables.add(cableId);
      const ifA = current(x) as Entity<'interface'> | undefined;
      const ifB = current(y) as Entity<'interface'> | undefined;
      const fiber = [ifA?.attrs.type, ifB?.attrs.type].some((t) => t && t !== 'rj45');
      upsert(cableId, 'cable', d.label || `${ifA?.name ?? '?'} ↔ ${ifB?.name ?? '?'}`, {
        aInterfaceId: x,
        bInterfaceId: y,
        type: d.kind === 'wireless' ? 'wireless' : fiber ? 'fiber' : 'copper',
        speed: d.speed,
        vlanId: d.vlanId ? vlanOf.get(d.vlanId) : undefined,
        mode: d.kind === 'trunk' ? 'trunk' : 'access',
        label: d.label,
      });
    } else {
      relate('connected_to', a.id, b.id, {
        kind: d.kind || 'access',
        ...(d.speed ? { speed: d.speed } : {}),
        ...(d.label ? { label: d.label } : {}),
        ...(d.vlanId && vlanOf.get(d.vlanId) ? { vlanId: vlanOf.get(d.vlanId) } : {}),
      });
    }
  }

  for (const r of desiredRel.values()) changes.push({ op: 'link', relation: r });

  // Убрать то, что раньше выводилось из этой схемы, а теперь нет
  const dropRef = (src: Entity['source']) => ({ ...src!, refs: (src?.refs || []).filter((x) => x !== projectId) });
  for (const r of repo.relations()) {
    if (r.source?.type !== 'diagram' || !r.source.refs?.includes(projectId) || desiredRel.has(r.id)) continue;
    const rest = dropRef(r.source);
    changes.push(rest.refs.length ? { op: 'link', relation: { ...r, source: rest } } : { op: 'unlink', id: r.id });
  }
  for (const c of repo.list('cable')) {
    if (c.source?.type !== 'diagram' || !c.source.refs?.includes(projectId) || desiredCables.has(c.id)) continue;
    const rest = dropRef(c.source);
    changes.push(rest.refs.length ? { op: 'upsert', entity: { ...c, source: rest } as EntityInput } : { op: 'delete', id: c.id });
  }

  const result = repo.apply(changes, `diagram:${projectId}`);
  return {
    patches: result.ok ? patches : {},
    changedIds: result.changedIds,
    issues: result.issues.map((i) => ({ level: i.level, message: i.message })),
  };
}

/** Применить NodePatch к data узла (вписать id объектов в узел, его порты, строки, сети) */
export function applyNodePatch(data: Data, p: NodePatch): Data {
  const next: Data = { ...data };
  if (p.entityId) next.entityId = p.entityId;
  if (p.ipEntityId !== undefined) next.ipEntityId = p.ipEntityId ?? undefined;
  if (p.ports) next.ports = ((data.ports as Data[]) || []).map((x) => (p.ports![x.id] ? { ...x, entityId: p.ports![x.id] } : x));
  if (p.items) next.items = ((data.items as Data[]) || []).map((x) => (p.items![x.id] ? { ...x, entityId: p.items![x.id] } : x));
  if (p.networks)
    next.networks = ((data.networks as Data[]) || []).map((x) =>
      p.networks![x.id] ? { ...x, entityId: p.networks![x.id].entityId, ...(p.networks![x.id].prefixEntityId ? { prefixEntityId: p.networks![x.id].prefixEntityId } : {}) } : x
    );
  return next;
}

export function applyPatches(nodes: Node[], patches: Record<string, NodePatch>): Node[] {
  if (!Object.keys(patches).length) return nodes;
  return nodes.map((n) => (patches[n.id] ? { ...n, data: applyNodePatch(n.data || {}, patches[n.id]) } : n));
}

/**
 * Реестр → схема: перенести изменённые объекты в узлы, где они нарисованы.
 * Возвращает новые узлы или null, если на схеме ничего не поменялось.
 */
export function applyEntitiesToNodes(repo: InventoryRepository, nodes: Node[], changedIds: Set<string>): Node[] | null {
  if (!changedIds.size) return null;
  // Сети этой схемы: VLAN в реестре → локальный id сети
  const localNet = new Map<string, string>();
  for (const n of nodes) {
    if (n.type !== 'networks') continue;
    for (const net of (n.data?.networks as Data[]) || []) if (net.entityId) localNet.set(net.entityId, net.id);
  }
  const vlanLocal = (vlanEntityId: string | undefined, fallback: string | undefined) =>
    vlanEntityId ? localNet.get(vlanEntityId) ?? fallback : undefined;

  let touched = false;
  const out = nodes.map((n) => {
    const d = (n.data || {}) as Data;
    const own = d.entityId && changedIds.has(d.entityId);
    const ipChanged = d.ipEntityId && changedIds.has(d.ipEntityId);
    let next: Data | null = null;
    const set = (k: string, v: unknown) => {
      if ((d[k] ?? '') !== (v ?? '')) (next ??= { ...d })[k] = v;
    };

    if (own) {
      const e = repo.get(d.entityId);
      if (e?.kind === 'device') {
        set('label', e.name);
        set('role', e.attrs.role);
        set('model', e.attrs.model);
        set('os', e.attrs.platform);
        set('hostname', e.attrs.hostname);
        set('vlanId', vlanLocal(e.attrs.vlanId, d.vlanId));
      } else if (e?.kind === 'group') {
        set('label', e.name);
        set('role', e.attrs.role);
        set('subtitle', e.attrs.subtitle);
        set('hostname', e.attrs.hostname);
      } else if (e?.kind === 'service') {
        set('label', e.name);
        set('subtitle', e.attrs.subtitle);
        set('url', e.attrs.url);
        set('badge', e.attrs.ref);
      } else if (e?.kind === 'external') {
        set('label', e.name);
        set('subtitle', e.attrs.note);
      }
    }
    if (ipChanged) {
      const ip = repo.get(d.ipEntityId);
      if (ip?.kind === 'ipAddress') set('ip', ip.attrs.address);
    }
    // Части узла: строки внешних систем / стека, сети панели
    for (const key of ['items', 'networks'] as const) {
      const list = d[key] as Data[] | undefined;
      const hit = (x: Data) => (x.entityId && changedIds.has(x.entityId)) || (x.prefixEntityId && changedIds.has(x.prefixEntityId));
      if (!list?.some(hit)) continue;
      const updated = list.map((x) => {
        if (!hit(x)) return x;
        let out = x;
        // Подсеть сети (панель «Сети»): CIDR правится в реестре
        if (x.prefixEntityId && changedIds.has(x.prefixEntityId)) {
          const p = repo.get(x.prefixEntityId);
          if (p?.kind === 'prefix') out = { ...out, cidr: p.attrs.cidr ?? out.cidr };
        }
        if (!x.entityId || !changedIds.has(x.entityId)) return out;
        const e = repo.get(x.entityId);
        if (!e) return out;
        x = out;
        if (e.kind === 'external') return { ...x, name: e.name, note: e.attrs.note };
        if (e.kind === 'software') return { ...x, name: e.name, url: e.attrs.url };
        if (e.kind === 'vlan') return { ...x, name: e.name, color: e.attrs.color ?? x.color, description: e.description };
        return x;
      });
      (next ??= { ...d })[key] = updated;
    }
    if (!next) return n;
    touched = true;
    return { ...n, data: next };
  });
  return touched ? out : null;
}

/** На каких схемах нарисован объект: entityId → [{ projectId, nodeId }] */
export function diagramIndex(projects: { id: string; nodes: Node[] }[]): Map<string, { projectId: string; nodeId: string }[]> {
  const idx = new Map<string, { projectId: string; nodeId: string }[]>();
  const add = (eid: string | undefined, projectId: string, nodeId: string) => {
    if (!eid) return;
    idx.set(eid, [...(idx.get(eid) || []), { projectId, nodeId }]);
  };
  for (const p of projects) {
    for (const n of p.nodes) {
      const d = (n.data || {}) as Data;
      add(d.entityId, p.id, n.id);
      add(d.ipEntityId, p.id, n.id);
      for (const x of [...((d.ports as Data[]) || []), ...((d.items as Data[]) || []), ...((d.networks as Data[]) || [])]) {
        add(x.entityId, p.id, n.id);
        add(x.prefixEntityId, p.id, n.id);
      }
    }
  }
  return idx;
}

/** Копия узла (клонирование / вставка) — это новый объект: убираем все привязки к реестру */
export function stripEntityIds<T extends Data>(data: T): T {
  const clean = (x: Data) => {
    const { entityId: _e, prefixEntityId: _p, ...rest } = x;
    return rest;
  };
  const { entityId: _e, ipEntityId: _i, ...rest } = data as Data;
  const out: Data = { ...rest };
  for (const key of ['ports', 'items', 'networks']) {
    if (Array.isArray(out[key])) out[key] = (out[key] as Data[]).map(clean);
  }
  return out as T;
}
