import { newEntityId, type InventoryRepository } from '../repository';
import type { Change, Entity, EntityInput, EntityKind, Relation, ValidationIssue } from '../types';
import type { DraftEntity, ImportResult } from './types';
import { normalizeIfName } from './util';

/**
 * Сверка черновика импорта с реестром: что уже есть (по серийнику, hostname, адресу,
 * имени порта…), что изменится и что новое. Затем — применение выбранного.
 */

export type PlanAction = 'create' | 'update' | 'same';

export interface PlanItem {
  key: string;
  kind: EntityKind;
  name: string;
  action: PlanAction;
  /** id в реестре: существующий или будущий */
  id: string;
  /** Чем нашли существующий объект */
  matchedBy?: string;
  changes: { field: string; from: unknown; to: unknown }[];
  draft: DraftEntity;
}

export interface ImportPlan {
  items: PlanItem[];
  relations: { rel: Relation; action: 'create' | 'same' }[];
  warnings: string[];
}

// Порядок важен: сначала то, на что ссылаются
const KIND_ORDER: EntityKind[] = [
  'vrf', 'vlan', 'site', 'rack', 'device', 'module', 'interface', 'prefix', 'ipAddress', 'cable',
  'cluster', 'host', 'vm', 'container', 'datastore', 'service', 'software', 'external', 'group',
];
const META_ATTRS = new Set(['taggedVlanKeys', 'status']);

const lower = (s?: unknown) => (typeof s === 'string' ? s.trim().toLowerCase() : '');

/** Одно имя порта в разных записях: Gi1/0/1 = GigabitEthernet1/0/1; MikroTik ether3 = «3», sfp-sfpplus1 = «SFP+1» */
export function portAlias(name: string): string {
  const n = normalizeIfName(name).toLowerCase();
  return n
    .replace(/^ether(\d+)$/, '$1')
    .replace(/^(?:sfp-sfpplus|sfpplus|sfp\+)(\d+)$/, 'sfp+$1')
    .replace(/^qsfpplus(\d+)-(\d+)$/, 'qsfp+$1-$2');
}
const short = (s?: unknown) => lower(s).replace(/\..*$/, '');
const eq = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Правила слияния импорта с тем, что уже есть (одни и те же для показа разницы и для применения):
 *  - имя-заглушку («VLAN 99» — в конфиге нет имени) не пишем поверх настоящего («MGMT»);
 *  - короткое имя хоста не заменяет полное того же хоста (mikrotik.internal ≠> MikroTik);
 *  - порядок портов — раскладка схемы, импорт его не меняет.
 */
const SKIP_ON_UPDATE = new Set(['order']);
const HOST_FIELDS = new Set(['hostname', 'dnsName']);
const isPlaceholderName = (kind: EntityKind, name?: string) => !name || (kind === 'vlan' && /^VLAN \d+$/.test(name));

function mergeAttrsForUpdate(prev: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(next)) {
    if (SKIP_ON_UPDATE.has(k) && prev[k] !== undefined) continue;
    if (HOST_FIELDS.has(k) && typeof prev[k] === 'string' && short(prev[k]) === short(v)) continue;
    out[k] = v;
  }
  return out;
}

function nameForUpdate(kind: EntityKind, prev: string, next?: string): string {
  if (['ipAddress', 'prefix', 'cable', 'module', 'interface'].includes(kind)) return prev;
  if (isPlaceholderName(kind, next)) return prev;
  if (short(prev) === short(next)) return prev;
  return next!;
}

export function buildPlan(repo: InventoryRepository, result: ImportResult): ImportPlan {
  const all = repo.list();
  const ofKind = <K extends EntityKind>(k: K) => all.filter((e): e is Entity<K> => e.kind === k);
  const idOf = new Map<string, string>(); // ключ черновика → id
  const items: PlanItem[] = [];
  const warnings: string[] = [];

  const ownerOfIp = (address: string): string | undefined => {
    const ip = ofKind('ipAddress').find((x) => x.attrs.address === address && !x.attrs.vrfId);
    if (!ip) return undefined;
    if (ip.attrs.assignedToId) return ip.attrs.assignedToId;
    if (ip.attrs.interfaceId) return (repo.get(ip.attrs.interfaceId) as Entity<'interface'> | undefined)?.attrs.deviceId;
    return ip.id;
  };

  const resolveKey = (key?: string): string | undefined => {
    if (!key) return undefined;
    if (key.startsWith('existing:')) return key.slice(9);
    if (key.startsWith('ipowner:')) return ownerOfIp(key.slice(8)) ?? idOf.get(`ip:default:${key.slice(8)}`);
    return idOf.get(key);
  };

  const resolveAttrs = (d: DraftEntity) => {
    const attrs: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(d.attrs)) if (!META_ATTRS.has(k)) attrs[k] = v;
    for (const [field, ref] of Object.entries(d.refs || {})) {
      const id = resolveKey(ref);
      if (id) attrs[field] = id;
    }
    const tagged = d.attrs.taggedVlanKeys as string[] | undefined;
    if (tagged?.length) attrs.taggedVlanIds = tagged.map((k) => resolveKey(k)).filter(Boolean);
    return attrs;
  };

  const findExisting = (d: DraftEntity, attrs: Record<string, unknown>): { e: Entity; by: string } | undefined => {
    switch (d.kind) {
      case 'vrf': {
        const e = ofKind('vrf').find((x) => lower(x.name) === lower(d.name));
        return e && { e, by: 'имя VRF' };
      }
      case 'vlan': {
        const e = ofKind('vlan').find((x) => x.attrs.vid === d.attrs.vid);
        return e && { e, by: `VID ${d.attrs.vid}` };
      }
      case 'device': {
        const sn = lower(d.match?.serial);
        if (sn) {
          const byDev = ofKind('device').find((x) => lower(x.attrs.serial) === sn);
          if (byDev) return { e: byDev, by: 'серийный номер' };
          const mod = ofKind('module').find((x) => lower(x.attrs.serial) === sn);
          const owner = mod?.attrs.deviceId ? repo.get(mod.attrs.deviceId) : undefined;
          if (owner) return { e: owner, by: 'серийный номер модуля' };
        }
        const hn = short(d.match?.hostname ?? d.name);
        if (hn) {
          const e = ofKind('device').find((x) => short(x.attrs.hostname) === hn || short(x.name) === hn);
          if (e) return { e, by: 'hostname' };
        }
        if (d.match?.mgmtIp) {
          const owner = ownerOfIp(d.match.mgmtIp);
          const e = owner ? repo.get(owner) : undefined;
          if (e?.kind === 'device') return { e, by: `адрес ${d.match.mgmtIp}` };
        }
        return undefined;
      }
      case 'module': {
        const e = ofKind('module').find((x) => lower(x.attrs.serial) === lower(d.attrs.serial));
        return e && { e, by: 'серийный номер' };
      }
      case 'interface': {
        const dev = attrs.deviceId as string | undefined;
        if (!dev) return undefined;
        const n = portAlias(d.name);
        const e = ofKind('interface').find((x) => x.attrs.deviceId === dev && portAlias(x.name) === n);
        return e && { e, by: 'имя порта' };
      }
      case 'prefix': {
        const e = ofKind('prefix').find((x) => x.attrs.cidr === d.attrs.cidr && (x.attrs.vrfId ?? '') === ((attrs.vrfId as string) ?? ''));
        return e && { e, by: 'CIDR' };
      }
      case 'ipAddress': {
        const e = ofKind('ipAddress').find((x) => x.attrs.address === d.attrs.address && (x.attrs.vrfId ?? '') === ((attrs.vrfId as string) ?? ''));
        return e && { e, by: 'адрес' };
      }
      case 'cable': {
        const a = attrs.aInterfaceId as string | undefined;
        const b = attrs.bInterfaceId as string | undefined;
        const e = ofKind('cable').find(
          (x) => (x.attrs.aInterfaceId === a && x.attrs.bInterfaceId === b) || (x.attrs.aInterfaceId === b && x.attrs.bInterfaceId === a)
        );
        return e && { e, by: 'концы кабеля' };
      }
      case 'software': {
        const host = d.key.split(':')[1];
        const e = ofKind('software').find(
          (x) => lower(x.name) === lower(d.name) && repo.relationsOf(x.id, 'from', 'runs_on').some((r) => r.toId === host)
        );
        return e && { e, by: 'имя на этом хосте' };
      }
      case 'vm':
      case 'container': {
        const e = all.find((x) => x.kind === d.kind && (lower(x.name) === lower(d.name) || eq((x.attrs as { vmid?: string }).vmid, d.attrs.vmid)));
        return e && { e, by: 'имя / VMID' };
      }
      default: {
        const e = all.find((x) => x.kind === d.kind && lower(x.name) === lower(d.name));
        return e && { e, by: 'имя' };
      }
    }
  };

  const drafts = [...result.entities].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  for (const d of drafts) {
    const attrs = resolveAttrs(d);
    const found = findExisting(d, attrs);
    if (found) {
      idOf.set(d.key, found.e.id);
      const prev = found.e.attrs as Record<string, unknown>;
      const changes: PlanItem['changes'] = [];
      for (const [k, v] of Object.entries(mergeAttrsForUpdate(prev, attrs))) if (!eq(prev[k], v)) changes.push({ field: k, from: prev[k], to: v });
      const nextName = nameForUpdate(d.kind, found.e.name, d.name);
      if (nextName !== found.e.name) changes.push({ field: 'name', from: found.e.name, to: nextName });
      if (d.description && d.description !== found.e.description) changes.push({ field: 'description', from: found.e.description, to: d.description });
      items.push({ key: d.key, kind: d.kind, name: found.e.name, action: changes.length ? 'update' : 'same', id: found.e.id, matchedBy: found.by, changes, draft: d });
    } else {
      // Кабель: тот же детерминированный id, что и у кабелей со схем
      let id = newEntityId();
      if (d.kind === 'cable' && attrs.aInterfaceId && attrs.bInterfaceId) {
        const [x, y] = [attrs.aInterfaceId as string, attrs.bInterfaceId as string].sort();
        id = `cable:${x}:${y}`;
      }
      idOf.set(d.key, id);
      items.push({ key: d.key, kind: d.kind, name: d.name, action: 'create', id, changes: [], draft: d });
    }
  }

  // Ссылки, которые разрешились только после создания id (порты нового устройства и т.п.)
  for (const it of items) {
    if (it.action !== 'create') continue;
    for (const [field, ref] of Object.entries(it.draft.refs || {})) {
      if (!resolveKey(ref)) warnings.push(`«${it.name}»: не найден объект для поля ${field}`);
    }
  }

  const relations: ImportPlan['relations'] = [];
  for (const r of result.relations) {
    const from = resolveKey(r.from);
    const to = resolveKey(r.to);
    if (!from || !to || from === to) continue;
    const id = `rel:${r.type}:${from}:${to}`;
    const prev = repo.relation(id);
    const rel: Relation = { id, type: r.type, fromId: from, toId: to, ...(r.props ? { props: Object.fromEntries(Object.entries(r.props).filter(([, v]) => v !== undefined)) } : {}) };
    relations.push({ rel, action: prev && eq(prev.props, rel.props) ? 'same' : 'create' });
  }

  return { items, relations, warnings: [...result.warnings, ...warnings] };
}

export interface ApplyImportResult {
  applied: number;
  skipped: { name: string; message: string }[];
  issues: ValidationIssue[];
}

/** Применить выбранные пункты плана (зависимости — новые объекты, на которые ссылаются, — добавляются сами) */
export function applyPlan(repo: InventoryRepository, plan: ImportPlan, selected: Set<string>, parser: string): ApplyImportResult {
  const byKey = new Map(plan.items.map((i) => [i.key, i]));
  const byId = new Map(plan.items.map((i) => [i.id, i]));
  const chosen = new Set<string>();
  const include = (key: string) => {
    const it = byKey.get(key);
    if (!it || chosen.has(key) || it.action === 'same') return;
    chosen.add(key);
    // Зависимости: новые объекты, на которые ссылаются поля
    for (const ref of Object.values(it.draft.refs || {})) {
      const dep = plan.items.find((x) => x.key === ref);
      if (dep?.action === 'create') include(dep.key);
    }
    for (const k of (it.draft.attrs.taggedVlanKeys as string[]) || []) {
      const dep = byKey.get(k);
      if (dep?.action === 'create') include(dep.key);
    }
  };
  for (const k of selected) include(k);

  const now = new Date().toISOString();
  const source = { type: 'import' as const, refs: [parser], at: now };

  const build = (it: PlanItem): Change => {
    const existing = it.action === 'update' ? repo.get(it.id) : undefined;
    const attrs: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(it.draft.attrs)) if (!META_ATTRS.has(k)) attrs[k] = v;
    for (const [field, ref] of Object.entries(it.draft.refs || {})) {
      const id = ref.startsWith('existing:') ? ref.slice(9) : byKey.get(ref)?.id;
      if (id) attrs[field] = id;
    }
    const tagged = (it.draft.attrs.taggedVlanKeys as string[] | undefined)?.map((k) => byKey.get(k)?.id).filter(Boolean);
    if (tagged?.length) attrs.taggedVlanIds = tagged;
    const status = it.draft.attrs.status as Entity['status'] | undefined;
    const entity = {
      ...(existing ?? {}),
      id: it.id,
      kind: it.kind,
      name: existing ? nameForUpdate(it.kind, existing.name, it.draft.name) : it.draft.name || it.name,
      ...(it.draft.description ? { description: it.draft.description } : {}),
      ...(status ? { status } : {}),
      attrs: existing
        ? { ...(existing.attrs as Record<string, unknown>), ...mergeAttrsForUpdate(existing.attrs as Record<string, unknown>, attrs) }
        : attrs,
      source: existing?.source ?? source,
    } as EntityInput;
    return { op: 'upsert', entity };
  };

  let pending: Change[] = plan.items.filter((i) => chosen.has(i.key)).map(build);
  // Связи — если оба конца есть в реестре или будут созданы
  const willExist = (id: string) => !!repo.get(id) || (byId.has(id) && chosen.has(byId.get(id)!.key));
  for (const { rel, action } of plan.relations) {
    if (action === 'same' || !willExist(rel.fromId) || !willExist(rel.toId)) continue;
    pending.push({ op: 'link', relation: { ...rel, source } });
  }

  // Ошибка одного объекта не блокирует остальные: откладываем проблемные и пробуем снова
  const skipped: ApplyImportResult['skipped'] = [];
  let res = repo.apply(pending, `import:${parser}`);
  for (let attempt = 0; !res.ok && attempt < 8; attempt++) {
    const bad = new Set(res.issues.filter((i) => i.level === 'error').flatMap((i) => i.entityIds.filter((id) => !repo.get(id) || pending.some((c) => c.op === 'upsert' && c.entity.id === id))));
    for (const i of res.issues.filter((x) => x.level === 'error')) skipped.push({ name: i.entityIds.map((id) => byId.get(id)?.name ?? id).join(', '), message: i.message });
    const next = pending.filter((c) =>
      c.op === 'upsert' ? !bad.has(c.entity.id) : c.op === 'link' ? !bad.has(c.relation.fromId) && !bad.has(c.relation.toId) : true
    );
    if (next.length === pending.length) break;
    pending = next;
    res = repo.apply(pending, `import:${parser}`);
  }
  return { applied: res.ok ? pending.length : 0, skipped, issues: res.issues };
}
