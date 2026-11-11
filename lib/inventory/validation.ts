import type { Entity, InventoryState, Relation, ValidationIssue } from './types';
import { buildPrefixTree, cidrHasIp, intToIp, ipToInt, parseCidr, parseRange, vrfOf } from './ipam';
import { linkWarnings, portFromInterface } from './ports';

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

// ─── IPAM (docs/INVENTORY_MODEL.md §6, пункты 1–5) ─────────────────────────

/** Дубль подсети в VRF — ошибка; хост-биты — предупреждение. Вложенность — норма */
const prefixDuplicates: Rule = (ctx) => {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, Entity<'prefix'>>();
  for (const p of byKind(ctx, 'prefix')) {
    const c = parseCidr(p.attrs.cidr);
    if (!c) continue;
    if (c.hostBits) {
      issues.push({ level: 'warning', rule: 'prefix-host-bits', message: `Подсеть ${p.attrs.cidr}: выставлены хост-биты, правильно ${intToIp(c.network)}/${c.len}`, entityIds: [p.id] });
    }
    const key = `${vrfOf(p)}|${c.network}/${c.len}`;
    const other = seen.get(key);
    if (other) {
      issues.push({ level: 'error', rule: 'prefix-duplicate', message: `Подсеть ${intToIp(c.network)}/${c.len} заведена дважды в одном VRF`, entityIds: [other.id, p.id] });
    } else seen.set(key, p);
  }
  return issues;
};

/** Шлюз внутри подсети и не адрес сети/broadcast; DHCP-диапазоны корректны и не пересекаются */
const prefixGatewayDhcp: Rule = (ctx) => {
  const issues: ValidationIssue[] = [];
  for (const p of byKind(ctx, 'prefix')) {
    const c = parseCidr(p.attrs.cidr);
    if (!c) continue;
    const name = `${intToIp(c.network)}/${c.len}`;
    if (p.attrs.gateway) {
      const gw = ipToInt(p.attrs.gateway);
      if (gw === null || !cidrHasIp(c, gw)) {
        issues.push({ level: 'error', rule: 'prefix-gateway', message: `Шлюз ${p.attrs.gateway} вне подсети ${name}`, entityIds: [p.id] });
      } else if (c.len < 31 && (gw === c.first || gw === c.last)) {
        issues.push({ level: 'error', rule: 'prefix-gateway', message: `Шлюз ${p.attrs.gateway} — адрес сети или broadcast в ${name}`, entityIds: [p.id] });
      }
    }
    const ranges = (p.attrs.dhcpRanges || []).map((r) => ({ r, pr: parseRange(r) }));
    ranges.forEach(({ r, pr }, i) => {
      if (!pr || pr.start < c.first || pr.end > c.last) {
        issues.push({ level: 'error', rule: 'prefix-dhcp', message: `DHCP ${r.start}–${r.end} некорректен или вне подсети ${name}`, entityIds: [p.id] });
        return;
      }
      for (const { r: r2, pr: pr2 } of ranges.slice(i + 1)) {
        if (pr2 && !(pr.end < pr2.start || pr.start > pr2.end)) {
          issues.push({ level: 'error', rule: 'prefix-dhcp', message: `DHCP-диапазоны ${r.start}–${r.end} и ${r2.start}–${r2.end} в ${name} пересекаются`, entityIds: [p.id] });
        }
      }
    });
  }
  return issues;
};

/** Адрес вне учтённых подсетей, в DHCP-пуле или на адресе сети/broadcast — предупреждения */
const ipPlacement: Rule = (ctx) => {
  const prefixes = byKind(ctx, 'prefix');
  if (!prefixes.length) return [];
  const ips = byKind(ctx, 'ipAddress');
  const tree = buildPrefixTree(prefixes, ips);
  const vrfsWithPrefixes = new Set(prefixes.map(vrfOf));
  const issues: ValidationIssue[] = [];
  for (const ip of tree.orphanIps) {
    if (!vrfsWithPrefixes.has(vrfOf(ip))) continue;
    issues.push({ level: 'warning', rule: 'ip-outside-ipam', message: `Адрес ${ip.attrs.address} не входит ни в одну подсеть`, entityIds: [ip.id] });
  }
  for (const ip of ips) {
    const home = tree.prefixOfIp(ip);
    const n = ipToInt(ip.attrs.address ?? '');
    if (!home || n === null) continue;
    if (home.cidr.len < 31 && (n === home.cidr.first || n === home.cidr.last)) {
      issues.push({ level: 'warning', rule: 'ip-network-broadcast', message: `Адрес ${ip.attrs.address} — адрес сети или broadcast подсети ${home.entity.attrs.cidr}`, entityIds: [ip.id, home.entity.id] });
    }
    for (const r of home.entity.attrs.dhcpRanges || []) {
      const pr = parseRange(r);
      if (pr && n >= pr.start && n <= pr.end) {
        issues.push({ level: 'warning', rule: 'ip-in-dhcp', message: `Адрес ${ip.attrs.address} попадает в DHCP-пул ${r.start}–${r.end}`, entityIds: [ip.id, home.entity.id] });
      }
    }
  }
  return issues;
};

/** Совместимость концов кабеля: среда, скорость, режим, VLAN, выключенный порт — предупреждения */
const cableCompat: Rule = (ctx) => {
  const issues: ValidationIssue[] = [];
  const vlanName = (id?: string) => (id ? ctx.state.entities[id]?.name ?? id : '');
  for (const c of byKind(ctx, 'cable')) {
    const a = c.attrs.aInterfaceId ? ctx.state.entities[c.attrs.aInterfaceId] : undefined;
    const b = c.attrs.bInterfaceId ? ctx.state.entities[c.attrs.bInterfaceId] : undefined;
    if (a?.kind !== 'interface' || b?.kind !== 'interface') continue;
    const dev = (i: Entity<'interface'>) => (i.attrs.deviceId ? ctx.state.entities[i.attrs.deviceId]?.name : undefined) ?? '?';
    const pa = { ...portFromInterface(a), name: `${dev(a)} · ${a.name}` };
    const pb = { ...portFromInterface(b), name: `${dev(b)} · ${b.name}` };
    for (const message of linkWarnings(pa, pb, vlanName)) {
      issues.push({ level: 'warning', rule: 'cable-compat', message, entityIds: [c.id, a.id, b.id] });
    }
  }
  return issues;
};

export const RULES: Rule[] = [
  cableCompat,
  relationEndpoints, containsNoCycles, cablePerInterface, serialUnique, vlanVid,
  prefixSyntax, ipSyntax, ipUnique, prefixDuplicates, prefixGatewayDhcp, ipPlacement,
];

export function runRules(ctx: RuleContext, rules: Rule[] = RULES): ValidationIssue[] {
  return rules.flatMap((r) => r(ctx));
}
