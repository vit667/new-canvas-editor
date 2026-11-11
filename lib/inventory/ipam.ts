import type { Entity } from './types';

/**
 * IPAM: арифметика IPv4, дерево подсетей, занятость и свободное место.
 * Чистые функции, без React. IPv6 — позже (адреса и подсети уже хранятся строками).
 *
 * Ключевой факт: два CIDR-блока либо вложены, либо не пересекаются — частичного
 * пересечения не бывает. Поэтому «пересечение» в IPAM = дубль той же подсети
 * в одном VRF; вложенность — это нормальная иерархия.
 */

export interface Cidr {
  /** Адрес сети (с обнулёнными хост-битами) */
  network: number;
  len: number;
  /** Первый и последний адрес блока */
  first: number;
  last: number;
  size: number;
  /** В исходной записи были выставлены хост-биты */
  hostBits: boolean;
}

const MAX = 0xffffffff;

export function ipToInt(s: string): number | null {
  const parts = s.trim().split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

export function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

const maskOf = (len: number) => (len === 0 ? 0 : (MAX << (32 - len)) >>> 0);

export function parseCidr(s?: string): Cidr | null {
  if (!s) return null;
  const [addr, lenS] = s.trim().split('/');
  if (lenS === undefined || !/^\d{1,2}$/.test(lenS)) return null;
  const len = Number(lenS);
  if (len > 32) return null;
  const ip = ipToInt(addr);
  if (ip === null) return null;
  const network = (ip & maskOf(len)) >>> 0;
  const size = 2 ** (32 - len);
  return { network, len, first: network, last: network + size - 1, size, hostBits: network !== ip };
}

export const formatCidr = (c: Pick<Cidr, 'network' | 'len'>) => `${intToIp(c.network)}/${c.len}`;
export const cidrContains = (outer: Cidr, inner: Cidr) => inner.first >= outer.first && inner.last <= outer.last;
export const cidrHasIp = (c: Cidr, ip: number) => ip >= c.first && ip <= c.last;

/** Адреса, пригодные для узлов: без адреса сети и broadcast (кроме /31 и /32) */
export function usableRange(c: Cidr): { first: number; last: number; count: number } {
  if (c.len >= 31) return { first: c.first, last: c.last, count: c.size };
  return { first: c.first + 1, last: c.last - 1, count: c.size - 2 };
}

export interface IpRange {
  start: number;
  end: number;
}

export function parseRange(r?: { start: string; end: string }): IpRange | null {
  if (!r) return null;
  const a = ipToInt(r.start);
  const b = ipToInt(r.end);
  if (a === null || b === null || b < a) return null;
  return { start: a, end: b };
}

/** Свободные интервалы внутри [from, to] за вычетом занятых точек и интервалов */
export function freeIntervals(from: number, to: number, taken: IpRange[]): IpRange[] {
  const sorted = taken
    .map((t) => ({ start: Math.max(t.start, from), end: Math.min(t.end, to) }))
    .filter((t) => t.start <= t.end)
    .sort((a, b) => a.start - b.start);
  const out: IpRange[] = [];
  let cur = from;
  for (const t of sorted) {
    if (t.start > cur) out.push({ start: cur, end: t.start - 1 });
    cur = Math.max(cur, t.end + 1);
    if (cur > to) break;
  }
  if (cur <= to) out.push({ start: cur, end: to });
  return out;
}

/** Разбить интервал на максимальные CIDR-блоки (для «свободные подсети») */
export function intervalToCidrs(r: IpRange): Cidr[] {
  const out: Cidr[] = [];
  let cur = r.start;
  while (cur <= r.end) {
    let len = 32;
    // Самый большой блок, выровненный по cur и помещающийся в интервал
    while (len > 0) {
      const size = 2 ** (32 - (len - 1));
      if (cur % size !== 0 || cur + size - 1 > r.end) break;
      len--;
    }
    const c = parseCidr(`${intToIp(cur)}/${len}`)!;
    out.push(c);
    cur = c.last + 1;
  }
  return out;
}

// ─── Дерево подсетей ─────────────────────────────────────────────────────────

export interface PrefixNode {
  entity: Entity<'prefix'>;
  cidr: Cidr;
  vrfId: string;
  children: PrefixNode[];
  parent?: PrefixNode;
  /** Адреса, лежащие прямо в этой подсети (не в дочерних) */
  ips: Entity<'ipAddress'>[];
  /** Все адреса внутри (включая дочерние) */
  ipCount: number;
}

export const DEFAULT_VRF = 'default';
export const vrfOf = (e: { attrs: { vrfId?: string } }) => e.attrs.vrfId || DEFAULT_VRF;

export interface PrefixTree {
  /** VRF → корневые подсети */
  roots: Map<string, PrefixNode[]>;
  byId: Map<string, PrefixNode>;
  /** Адреса вне любых подсетей своего VRF */
  orphanIps: Entity<'ipAddress'>[];
  /** Наименьшая подсеть, содержащая адрес */
  prefixOfIp: (ip: Entity<'ipAddress'>) => PrefixNode | undefined;
}

export function buildPrefixTree(prefixes: Entity<'prefix'>[], ips: Entity<'ipAddress'>[]): PrefixTree {
  const nodes: PrefixNode[] = [];
  for (const p of prefixes) {
    const cidr = parseCidr(p.attrs.cidr);
    if (!cidr) continue;
    nodes.push({ entity: p, cidr, vrfId: vrfOf(p), children: [], ips: [], ipCount: 0 });
  }
  // Большие блоки раньше: родитель всегда обработан до детей. Дубли — по id, стабильно
  nodes.sort((a, b) => a.vrfId.localeCompare(b.vrfId) || a.cidr.len - b.cidr.len || a.cidr.network - b.cidr.network || a.entity.id.localeCompare(b.entity.id));

  const roots = new Map<string, PrefixNode[]>();
  const placed: PrefixNode[] = [];
  for (const n of nodes) {
    // Родитель — самый глубокий уже размещённый блок, строго содержащий n (дубль не родитель)
    let parent: PrefixNode | undefined;
    for (const cand of placed) {
      if (cand.vrfId !== n.vrfId || cand.cidr.len >= n.cidr.len) continue;
      if (cidrContains(cand.cidr, n.cidr) && (!parent || cand.cidr.len > parent.cidr.len)) parent = cand;
    }
    n.parent = parent;
    if (parent) parent.children.push(n);
    else roots.set(n.vrfId, [...(roots.get(n.vrfId) || []), n]);
    placed.push(n);
  }

  const deepest = (vrf: string, ip: number): PrefixNode | undefined => {
    let best: PrefixNode | undefined;
    for (const n of nodes) {
      if (n.vrfId === vrf && cidrHasIp(n.cidr, ip) && (!best || n.cidr.len > best.cidr.len)) best = n;
    }
    return best;
  };

  const orphanIps: Entity<'ipAddress'>[] = [];
  const ipHome = new Map<string, PrefixNode>();
  for (const ip of ips) {
    const n = ip.attrs.address ? ipToInt(ip.attrs.address) : null;
    if (n === null) continue;
    const home = deepest(vrfOf(ip), n);
    if (!home) {
      orphanIps.push(ip);
      continue;
    }
    ipHome.set(ip.id, home);
    home.ips.push(ip);
    for (let p: PrefixNode | undefined = home; p; p = p.parent) p.ipCount++;
  }
  const byId = new Map(nodes.map((n) => [n.entity.id, n]));
  return { roots, byId, orphanIps, prefixOfIp: (ip) => ipHome.get(ip.id) };
}

// ─── Занятость подсети ───────────────────────────────────────────────────────

export type CellState = 'network' | 'broadcast' | 'gateway' | 'used' | 'dhcp' | 'child' | 'free';

export interface PrefixUsage {
  usable: number;
  /** Занято адресами (IP + шлюз) */
  used: number;
  /** Занято дочерними подсетями (адресов) */
  inChildren: number;
  dhcp: number;
  free: number;
  /** 0..1: доля использованного (адреса + дочерние + DHCP) от полезных */
  utilization: number;
  freeRanges: IpRange[];
}

function ipsIn(node: PrefixNode): number[] {
  return node.ips.map((ip) => ipToInt(ip.attrs.address ?? '')).filter((x): x is number => x !== null);
}

export function prefixUsage(node: PrefixNode): PrefixUsage {
  const u = usableRange(node.cidr);
  const taken: IpRange[] = [];
  const points = new Set<number>(ipsIn(node));
  const gw = node.entity.attrs.gateway ? ipToInt(node.entity.attrs.gateway) : null;
  if (gw !== null && cidrHasIp(node.cidr, gw)) points.add(gw);
  for (const p of points) taken.push({ start: p, end: p });
  let inChildren = 0;
  for (const c of node.children) {
    taken.push({ start: c.cidr.first, end: c.cidr.last });
    inChildren += c.cidr.size;
  }
  let dhcp = 0;
  for (const r of node.entity.attrs.dhcpRanges || []) {
    const pr = parseRange(r);
    if (!pr) continue;
    taken.push(pr);
    dhcp += pr.end - pr.start + 1;
  }
  const freeRanges = freeIntervals(u.first, u.last, taken);
  const free = freeRanges.reduce((s, r) => s + (r.end - r.start + 1), 0);
  return {
    usable: u.count,
    used: points.size,
    inChildren,
    dhcp,
    free,
    utilization: u.count ? Math.min(1, (u.count - free) / u.count) : 1,
    freeRanges,
  };
}

/** Следующий свободный адрес в подсети (не шлюз, не занят, не DHCP, не в дочерних) */
export function nextFreeIp(node: PrefixNode): string | null {
  const r = prefixUsage(node).freeRanges[0];
  return r ? intToIp(r.start) : null;
}

/** Первая свободная подсеть заданной длины внутри узла */
export function nextFreeSubnet(node: PrefixNode, len: number): string | null {
  if (len <= node.cidr.len || len > 32) return null;
  const size = 2 ** (32 - len);
  const taken: IpRange[] = node.children.map((c) => ({ start: c.cidr.first, end: c.cidr.last }));
  for (const ip of ipsIn(node)) taken.push({ start: ip, end: ip });
  const gw = node.entity.attrs.gateway ? ipToInt(node.entity.attrs.gateway) : null;
  if (gw !== null) taken.push({ start: gw, end: gw });
  for (const r of node.entity.attrs.dhcpRanges || []) {
    const pr = parseRange(r);
    if (pr) taken.push(pr);
  }
  for (const f of freeIntervals(node.cidr.first, node.cidr.last, taken)) {
    const start = Math.ceil(f.start / size) * size;
    if (start + size - 1 <= f.end) return `${intToIp(start)}/${len}`;
  }
  return null;
}

/** Карта адресов для подсетей до /22 (≤1024 ячеек): состояние каждого адреса */
export function addressMap(node: PrefixNode): { ip: number; state: CellState; ipEntity?: Entity<'ipAddress'> }[] | null {
  if (node.cidr.size > 1024) return null;
  const byIp = new Map<number, Entity<'ipAddress'>>();
  for (const ip of node.ips) {
    const n = ipToInt(ip.attrs.address ?? '');
    if (n !== null) byIp.set(n, ip);
  }
  const gw = node.entity.attrs.gateway ? ipToInt(node.entity.attrs.gateway) : null;
  const dhcp = (node.entity.attrs.dhcpRanges || []).map(parseRange).filter(Boolean) as IpRange[];
  const small = node.cidr.len >= 31;
  const out: { ip: number; state: CellState; ipEntity?: Entity<'ipAddress'> }[] = [];
  for (let ip = node.cidr.first; ip <= node.cidr.last; ip++) {
    let state: CellState = 'free';
    if (!small && ip === node.cidr.first) state = 'network';
    else if (!small && ip === node.cidr.last) state = 'broadcast';
    else if (node.children.some((c) => cidrHasIp(c.cidr, ip))) state = 'child';
    else if (byIp.has(ip)) state = 'used';
    else if (ip === gw) state = 'gateway';
    else if (dhcp.some((r) => ip >= r.start && ip <= r.end)) state = 'dhcp';
    out.push({ ip, state, ipEntity: byIp.get(ip) });
  }
  return out;
}

// ─── Проверка новой подсети (для формы — те же правила, что в реестре) ─────

export interface PrefixCheck {
  errors: string[];
  warnings: string[];
  /** Нормализованная запись */
  normalized?: string;
  parent?: PrefixNode;
  /** Существующие подсети, которые окажутся внутри новой */
  swallows: PrefixNode[];
}

export function checkNewPrefix(
  tree: PrefixTree,
  input: { cidr: string; vrfId?: string; gateway?: string; dhcpRanges?: { start: string; end: string }[]; selfId?: string }
): PrefixCheck {
  const res: PrefixCheck = { errors: [], warnings: [], swallows: [] };
  const c = parseCidr(input.cidr);
  if (!c) {
    res.errors.push('Некорректный CIDR. Пример: 10.0.10.0/24');
    return res;
  }
  res.normalized = formatCidr(c);
  if (c.hostBits) res.warnings.push(`Выставлены хост-биты: подсеть будет ${res.normalized}`);
  const vrf = input.vrfId || DEFAULT_VRF;
  const all = [...tree.byId.values()].filter((n) => n.vrfId === vrf && n.entity.id !== input.selfId);
  const dup = all.find((n) => n.cidr.network === c.network && n.cidr.len === c.len);
  if (dup) res.errors.push(`Подсеть ${res.normalized} уже есть в этом VRF («${dup.entity.name}»)`);
  res.parent = all.filter((n) => n.cidr.len < c.len && cidrContains(n.cidr, c)).sort((a, b) => b.cidr.len - a.cidr.len)[0];
  res.swallows = all.filter((n) => n.cidr.len > c.len && cidrContains(c, n.cidr));
  // Новая подсеть не должна попадать в DHCP-пул родителя
  for (const r of res.parent?.entity.attrs.dhcpRanges || []) {
    const pr = parseRange(r);
    if (pr && !(c.last < pr.start || c.first > pr.end)) res.warnings.push(`Пересекается с DHCP-пулом ${r.start}–${r.end} подсети ${res.parent!.entity.name}`);
  }
  if (input.gateway?.trim()) {
    const gw = ipToInt(input.gateway);
    if (gw === null) res.errors.push('Шлюз: некорректный адрес');
    else if (!cidrHasIp(c, gw)) res.errors.push(`Шлюз ${input.gateway} вне подсети ${res.normalized}`);
    else if (c.len < 31 && (gw === c.first || gw === c.last)) res.errors.push('Шлюз не может быть адресом сети или broadcast');
  }
  const ranges = (input.dhcpRanges || []).map((r) => ({ r, pr: parseRange(r) }));
  ranges.forEach(({ r, pr }, i) => {
    if (!pr) return res.errors.push(`DHCP ${r.start}–${r.end}: некорректный диапазон`);
    if (pr.start < c.first || pr.end > c.last) res.errors.push(`DHCP ${r.start}–${r.end} выходит за подсеть`);
    for (const { r: r2, pr: pr2 } of ranges.slice(i + 1)) {
      if (pr2 && !(pr.end < pr2.start || pr.start > pr2.end)) res.errors.push(`DHCP-диапазоны ${r.start}–${r.end} и ${r2.start}–${r2.end} пересекаются`);
    }
  });
  return res;
}
