import type { Entity, InventoryState, Relation, ValidationIssue } from './types';

/**
 * Проверки целостности реестра (docs/INVENTORY_MODEL.md §6).
 * Здесь — правила этапа 0. Проверки IPAM (пересечения CIDR и т.п.) добавятся на этапе 2
 * в этот же список, интерфейс правила не меняется.
 */

export interface RuleContext {
  state: InventoryState;
  entities: Entity[];
  relations: Relation[];
  /** id объектов и связей, затронутых пакетом (для быстрых проверок) */
  changed: Set<string>;
}

export type Rule = (ctx: RuleContext) => ValidationIssue[];

const byKind = <K extends Entity['kind']>(ctx: RuleContext, kind: K) =>
  ctx.entities.filter((e): e is Extract<Entity, { kind: K }> => e.kind === kind);

/** У связи оба конца существуют */
const relationEndpoints: Rule = (ctx) =>
  ctx.relations
    .filter((r) => !ctx.state.entities[r.fromId] || !ctx.state.entities[r.toId])
    .map((r) => ({
      level: 'error' as const,
      rule: 'relation-endpoints',
      message: `Связь ${r.type} ссылается на несуществующий объект`,
      entityIds: [r.fromId, r.toId].filter((id) => ctx.state.entities[id]),
    }));

/** «Содержит» без циклов: объект не может лежать сам в себе через цепочку */
const containsNoCycles: Rule = (ctx) => {
  const parents = new Map<string, string[]>();
  for (const r of ctx.relations) {
    if (r.type !== 'contains') continue;
    parents.set(r.toId, [...(parents.get(r.toId) || []), r.fromId]);
  }
  const issues: ValidationIssue[] = [];
  const reported = new Set<string>();
  for (const start of parents.keys()) {
    const stack = [...(parents.get(start) || [])];
    const seen = new Set<string>();
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === start) {
        if (!reported.has(start)) {
          reported.add(start);
          issues.push({ level: 'error', rule: 'contains-cycle', message: 'Циклическая вложенность', entityIds: [start] });
        }
        break;
      }
      if (seen.has(cur)) continue;
      seen.add(cur);
      stack.push(...(parents.get(cur) || []));
    }
  }
  return issues;
};

/** Один кабель на интерфейс, оба конца — существующие интерфейсы */
const cablePerInterface: Rule = (ctx) => {
  const issues: ValidationIssue[] = [];
  const used = new Map<string, string>();
  for (const c of byKind(ctx, 'cable')) {
    for (const end of [c.attrs.aInterfaceId, c.attrs.bInterfaceId]) {
      if (!end) continue;
      const iface = ctx.state.entities[end];
      if (!iface || iface.kind !== 'interface') {
        issues.push({ level: 'error', rule: 'cable-endpoint', message: `Кабель «${c.name}» подключён к несуществующему интерфейсу`, entityIds: [c.id] });
        continue;
      }
      const other = used.get(end);
      if (other && other !== c.id) {
        issues.push({
          level: 'error',
          rule: 'cable-per-interface',
          message: `К интерфейсу «${iface.name}» подключено больше одного кабеля`,
          entityIds: [end, other, c.id],
        });
      } else used.set(end, c.id);
    }
  }
  return issues;
};

/** Серийный номер уникален среди устройств и модулей */
const serialUnique: Rule = (ctx) => {
  const seen = new Map<string, string>();
  const issues: ValidationIssue[] = [];
  for (const e of ctx.entities) {
    if (e.kind !== 'device' && e.kind !== 'module') continue;
    const sn = e.attrs.serial?.trim().toUpperCase();
    if (!sn) continue;
    const other = seen.get(sn);
    if (other) issues.push({ level: 'warning', rule: 'serial-unique', message: `Серийный номер ${sn} встречается дважды`, entityIds: [other, e.id] });
    else seen.set(sn, e.id);
  }
  return issues;
};

/** VID в диапазоне 1–4094 и уникален в пределах площадки */
const vlanVid: Rule = (ctx) => {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, string>();
  for (const v of byKind(ctx, 'vlan')) {
    const vid = v.attrs.vid;
    if (vid == null) continue;
    if (!Number.isInteger(vid) || vid < 1 || vid > 4094) {
      issues.push({ level: 'error', rule: 'vlan-vid-range', message: `VLAN «${v.name}»: VID ${vid} вне диапазона 1–4094`, entityIds: [v.id] });
      continue;
    }
    const key = `${v.attrs.siteId || ''}:${vid}`;
    const other = seen.get(key);
    if (other) issues.push({ level: 'warning', rule: 'vlan-vid-unique', message: `VID ${vid} используется двумя VLAN`, entityIds: [other, v.id] });
    else seen.set(key, v.id);
  }
  return issues;
};

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

export function isIPv4(s: string): boolean {
  return IPV4.test(s.trim());
}

/** Синтаксис CIDR подсети (полные проверки IPAM — этап 2) */
const prefixSyntax: Rule = (ctx) => {
  const issues: ValidationIssue[] = [];
  for (const p of byKind(ctx, 'prefix')) {
    const cidr = p.attrs.cidr?.trim();
    if (!cidr) continue;
    const [addr, len] = cidr.split('/');
    const n = Number(len);
    const ok = addr && len !== undefined && (isIPv4(addr) ? n >= 0 && n <= 32 : addr.includes(':') && n >= 0 && n <= 128);
    if (!ok || !Number.isInteger(n)) {
      issues.push({ level: 'error', rule: 'prefix-cidr', message: `Подсеть «${p.name}»: некорректный CIDR «${cidr}»`, entityIds: [p.id] });
    }
  }
  return issues;
};

/** IP-адрес: синтаксис */
const ipSyntax: Rule = (ctx) =>
  byKind(ctx, 'ipAddress')
    .filter((ip) => ip.attrs.address && !isIPv4(ip.attrs.address) && !ip.attrs.address.includes(':'))
    .map((ip) => ({
      level: 'error' as const,
      rule: 'ip-syntax',
      message: `Некорректный IP-адрес «${ip.attrs.address}»`,
      entityIds: [ip.id],
    }));

/** IP-адрес уникален в VRF */
const ipUnique: Rule = (ctx) => {
  const seen = new Map<string, string>();
  const issues: ValidationIssue[] = [];
  for (const ip of byKind(ctx, 'ipAddress')) {
    const a = ip.attrs.address?.trim();
    if (!a) continue;
    const key = `${ip.attrs.vrfId || 'default'}|${a}`;
    const other = seen.get(key);
    if (other) issues.push({ level: 'warning', rule: 'ip-unique', message: `Адрес ${a} назначен дважды`, entityIds: [other, ip.id] });
    else seen.set(key, ip.id);
  }
  return issues;
};

export const RULES: Rule[] = [relationEndpoints, containsNoCycles, cablePerInterface, serialUnique, vlanVid, prefixSyntax, ipSyntax, ipUnique];

export function runRules(ctx: RuleContext, rules: Rule[] = RULES): ValidationIssue[] {
  return rules.flatMap((r) => r(ctx));
}
