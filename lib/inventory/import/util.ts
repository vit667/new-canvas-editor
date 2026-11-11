import { intToIp, ipToInt } from '../ipam';
import type { DraftEntity, DraftRelation, ImportResult, ParserId } from './types';

/** Маска 255.255.255.0 → 24 (null, если маска неканоническая) */
export function maskToLen(mask: string): number | null {
  const n = ipToInt(mask);
  if (n === null) return null;
  let len = 0;
  let seenZero = false;
  for (let i = 31; i >= 0; i--) {
    const bit = (n >>> i) & 1;
    if (bit && seenZero) return null;
    if (bit) len++;
    else seenZero = true;
  }
  return len;
}

/** Адрес + длина → подсеть «10.0.10.0/24» */
export function networkOf(address: string, len: number): string | null {
  const n = ipToInt(address);
  if (n === null || len < 0 || len > 32) return null;
  const mask = len === 0 ? 0 : (0xffffffff << (32 - len)) >>> 0;
  return `${intToIp((n & mask) >>> 0)}/${len}`;
}

const RFC1918 = [
  ['10.0.0.0', 8],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['100.64.0.0', 10],
] as const;
export function isPrivateIp(a: string): boolean {
  const n = ipToInt(a);
  if (n === null) return false;
  return RFC1918.some(([net, len]) => {
    const mask = (0xffffffff << (32 - len)) >>> 0;
    return ((n & mask) >>> 0) === ((ipToInt(net)! & mask) >>> 0);
  });
}

/** Сокращения имён интерфейсов Cisco/Huawei → полная форма */
const IFACE_PREFIXES: [RegExp, string][] = [
  [/^(?:hu|hundredgige?|hundredgigabitethernet)(?=\d)/i, 'HundredGigE'],
  [/^(?:fo|fortygige?|fortygigabitethernet)(?=\d)/i, 'FortyGigabitEthernet'],
  [/^(?:twe|twentyfivegige?)(?=\d)/i, 'TwentyFiveGigE'],
  [/^(?:fi|fivegigabitethernet)(?=\d)/i, 'FiveGigabitEthernet'],
  [/^(?:tw|twogigabitethernet)(?=\d)/i, 'TwoGigabitEthernet'],
  [/^(?:te|tengige?|tengigabitethernet)(?=\d)/i, 'TenGigabitEthernet'],
  [/^(?:xge|xgigabitethernet)(?=\d)/i, 'XGigabitEthernet'],
  [/^(?:mge|multigigabitethernet)(?=\d)/i, 'MultiGE'],
  [/^(?:ge|gi|gigabitethernet)(?=\d)/i, 'GigabitEthernet'],
  [/^(?:fa|fastethernet)(?=\d)/i, 'FastEthernet'],
  [/^(?:eth-trunk)(?=\d)/i, 'Eth-Trunk'],
  [/^(?:po|port-channel)(?=\d)/i, 'Port-channel'],
  [/^(?:vlanif)(?=\d)/i, 'Vlanif'],
  [/^(?:vl|vlan)(?=\d)/i, 'Vlan'],
  [/^(?:lo|loopback)(?=\d)/i, 'Loopback'],
  [/^(?:tu|tunnel)(?=\d)/i, 'Tunnel'],
  [/^(?:meth)(?=\d)/i, 'MEth'],
  [/^(?:eth|ethernet)(?=\d)/i, 'Ethernet'],
];

export function normalizeIfName(name: string): string {
  const s = name.trim().replace(/\s+/g, '');
  for (const [re, full] of IFACE_PREFIXES) if (re.test(s)) return s.replace(re, full);
  return s;
}

/** Тип и скорость по имени интерфейса */
export function ifaceTypeSpeed(name: string): { type?: string; speed?: string; mode?: 'routed' } {
  const n = normalizeIfName(name);
  if (/^(Vlan|Vlanif|Loopback|Tunnel)\d/i.test(n)) return { type: 'virtual', mode: 'routed' };
  if (/^(Port-channel|Eth-Trunk)\d/i.test(n)) return { type: 'lag' };
  if (/^HundredGigE/.test(n)) return { type: 'qsfp', speed: '100G' };
  if (/^FortyGigabitEthernet|^40GE/.test(n)) return { type: 'qsfp', speed: '40G' };
  if (/^TwentyFiveGigE/.test(n)) return { type: 'sfp+', speed: '25G' };
  if (/^(TenGigabitEthernet|XGigabitEthernet)/.test(n)) return { type: 'sfp+', speed: '10G' };
  if (/^FiveGigabitEthernet/.test(n)) return { type: 'rj45', speed: '5G' };
  if (/^(TwoGigabitEthernet|MultiGE)/.test(n)) return { type: 'rj45', speed: '2.5G' };
  if (/^GigabitEthernet/.test(n)) return { type: 'rj45', speed: '1G' };
  if (/^FastEthernet/.test(n)) return { type: 'rj45', speed: '100M' };
  return {};
}

/** Список VLAN «10,20,30-35» / «10 20 30 to 35» → [10,20,30,…,35] */
export function parseVlanList(s: string): number[] {
  const out = new Set<number>();
  const norm = s.replace(/\s+to\s+/gi, '-').replace(/[,\s]+/g, ',');
  for (const part of norm.split(',')) {
    if (!part) continue;
    const [a, b] = part.split('-').map(Number);
    if (!Number.isInteger(a)) continue;
    const end = Number.isInteger(b) ? b : a;
    for (let v = a; v <= end && v - a < 4094; v++) if (v >= 1 && v <= 4094) out.add(v);
  }
  return [...out].sort((x, y) => x - y);
}

/** Строитель черновика: без дублей по ключу, с подсчётом */
export class DraftBuilder {
  entities = new Map<string, DraftEntity>();
  relations = new Map<string, DraftRelation>();
  warnings: string[] = [];

  constructor(public parser: ParserId) {}

  entity(e: DraftEntity): DraftEntity {
    const prev = this.entities.get(e.key);
    if (prev) {
      // Сливаем: новые непустые значения дополняют старые
      for (const [k, v] of Object.entries(e.attrs)) if (v !== undefined && v !== '') prev.attrs[k] = v;
      prev.refs = { ...prev.refs, ...e.refs };
      prev.match = { ...prev.match, ...e.match };
      if (e.description) prev.description = e.description;
      if (e.name) prev.name = e.name;
      return prev;
    }
    const clean: DraftEntity = { ...e, attrs: Object.fromEntries(Object.entries(e.attrs).filter(([, v]) => v !== undefined && v !== '')) };
    this.entities.set(e.key, clean);
    return clean;
  }

  relate(r: DraftRelation) {
    this.relations.set(`${r.type}|${r.from}|${r.to}`, r);
  }

  result(title: string): ImportResult {
    const stats: Record<string, number> = {};
    for (const e of this.entities.values()) stats[e.kind] = (stats[e.kind] || 0) + 1;
    return {
      parser: this.parser,
      title,
      entities: [...this.entities.values()],
      relations: [...this.relations.values()],
      warnings: this.warnings,
      stats,
    };
  }
}

export const devKey = (host: string) => `device:${host.toLowerCase()}`;
export const ifKey = (host: string, iface: string) => `iface:${host.toLowerCase()}:${normalizeIfName(iface)}`;
export const vlanKey = (vid: number | string) => `vlan:${vid}`;
export const vrfKey = (name?: string) => (name ? `vrf:${name}` : undefined);
export const prefixKey = (cidr: string, vrf?: string) => `prefix:${vrf ?? 'default'}:${cidr}`;
export const ipKey = (addr: string, vrf?: string) => `ip:${vrf ?? 'default'}:${addr}`;

/** Добавить IP интерфейса: адрес, подсеть (для SVI — со шлюзом и VLAN) */
export function addInterfaceIp(
  b: DraftBuilder,
  opts: { host: string; iface: string; address: string; len: number; vrf?: string; vid?: number; hostname?: string }
) {
  const cidr = networkOf(opts.address, opts.len);
  const ik = ifKey(opts.host, opts.iface);
  b.entity({
    key: ipKey(opts.address, opts.vrf),
    kind: 'ipAddress',
    name: opts.address,
    attrs: { address: opts.address, role: 'primary', dnsName: opts.hostname },
    refs: { interfaceId: ik, ...(opts.vrf ? { vrfId: vrfKey(opts.vrf)! } : {}), ...(opts.vid ? { vlanId: vlanKey(opts.vid) } : {}) },
  });
  if (cidr && opts.len < 31) {
    b.entity({
      key: prefixKey(cidr, opts.vrf),
      kind: 'prefix',
      name: cidr,
      attrs: { cidr, ...(opts.vid ? { gateway: opts.address } : {}) },
      refs: { ...(opts.vrf ? { vrfId: vrfKey(opts.vrf)! } : {}), ...(opts.vid ? { vlanId: vlanKey(opts.vid) } : {}) },
    });
  }
}

/** Блоки конфигурации «interface X … ! / #» */
export function configBlocks(text: string, header: RegExp, end: RegExp = /^(!|#|\S)/): { head: RegExpMatchArray; body: string[] }[] {
  const lines = text.split(/\r?\n/);
  const out: { head: RegExpMatchArray; body: string[] }[] = [];
  let cur: { head: RegExpMatchArray; body: string[] } | null = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const m = line.match(header);
    if (m) {
      cur = { head: m, body: [] };
      out.push(cur);
      continue;
    }
    if (!cur) continue;
    if (/^\s+\S/.test(line)) cur.body.push(line.trim());
    else if (end.test(line) || line === '') cur = null;
  }
  return out;
}
