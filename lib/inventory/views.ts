import type { Entity, Relation } from './types';
import { isIPv4 } from './validation';

/**
 * Сводки для таблиц реестра: кто чей, что к чему подключено.
 * Чистые функции над снимком реестра — без React, переносимы на сервер.
 */

export interface InventoryLookups {
  byId: Map<string, Entity>;
  /** Отображаемое имя: у интерфейса — «Устройство · порт» */
  label: (id?: string) => string;
  /** IP-адреса, назначенные объекту (assignedTo) или его интерфейсам */
  ipsOf: (id: string) => Entity<'ipAddress'>[];
  /** Интерфейсы устройства по порядку */
  portsOf: (deviceId: string) => Entity<'interface'>[];
  /** С чем соединён интерфейс: кабель → другой интерфейс; связь со схемы → объект */
  peerOf: (interfaceId: string) => { id: string; via: 'cable' | 'link'; kind?: string } | undefined;
  /** Связи объекта (включая связи его интерфейсов, если это устройство) */
  relationsOf: (id: string) => { rel: Relation; via: string }[];
  /** Что работает на объекте (runs_on → он) */
  runningOn: (id: string) => Entity[];
  /** Где работает объект (он → runs_on) */
  hostOf: (id: string) => Entity | undefined;
  /** Что содержит объект / в чём он лежит */
  childrenOf: (id: string) => Entity[];
  parentOf: (id: string) => Entity | undefined;
  /** Подсети VLAN и адреса в подсети */
  prefixesOfVlan: (vlanId: string) => Entity<'prefix'>[];
  ipsInPrefix: (prefixId: string) => Entity<'ipAddress'>[];
}

const ipv4ToInt = (s: string) => s.split('.').reduce((a, o) => (a << 8) + Number(o), 0) >>> 0;

export function ipInCidr(address: string, cidr: string): boolean {
  const [net, lenS] = cidr.split('/');
  const len = Number(lenS);
  if (!isIPv4(address) || !isIPv4(net) || !(len >= 0 && len <= 32)) return false;
  if (len === 0) return true;
  const mask = (0xffffffff << (32 - len)) >>> 0;
  return (ipv4ToInt(address) & mask) === (ipv4ToInt(net) & mask);
}

export function buildLookups(entities: Entity[], relations: Relation[]): InventoryLookups {
  const byId = new Map(entities.map((e) => [e.id, e]));
  const ofKind = <K extends Entity['kind']>(k: K) => entities.filter((e): e is Entity<K> => e.kind === k);

  const ports = new Map<string, Entity<'interface'>[]>();
  for (const i of ofKind('interface')) {
    if (!i.attrs.deviceId) continue;
    ports.set(i.attrs.deviceId, [...(ports.get(i.attrs.deviceId) || []), i]);
  }
  for (const list of ports.values()) list.sort((a, b) => (a.attrs.order ?? 0) - (b.attrs.order ?? 0));

  const ownerOfInterface = (id: string) => (byId.get(id) as Entity<'interface'> | undefined)?.attrs.deviceId;
  const ips = new Map<string, Entity<'ipAddress'>[]>();
  for (const ip of ofKind('ipAddress')) {
    const owner = ip.attrs.assignedToId ?? (ip.attrs.interfaceId ? ownerOfInterface(ip.attrs.interfaceId) : undefined);
    if (owner) ips.set(owner, [...(ips.get(owner) || []), ip]);
  }

  const peer = new Map<string, { id: string; via: 'cable' | 'link'; kind?: string }>();
  for (const c of ofKind('cable')) {
    const { aInterfaceId: a, bInterfaceId: b } = c.attrs;
    if (a && b) {
      peer.set(a, { id: b, via: 'cable', kind: c.attrs.type });
      peer.set(b, { id: a, via: 'cable', kind: c.attrs.type });
    }
  }
  const relFrom = new Map<string, Relation[]>();
  const relTo = new Map<string, Relation[]>();
  for (const r of relations) {
    relFrom.set(r.fromId, [...(relFrom.get(r.fromId) || []), r]);
    relTo.set(r.toId, [...(relTo.get(r.toId) || []), r]);
    if (r.type === 'connected_to') {
      const kind = typeof r.props?.kind === 'string' ? r.props.kind : undefined;
      if (byId.get(r.fromId)?.kind === 'interface' && !peer.has(r.fromId)) peer.set(r.fromId, { id: r.toId, via: 'link', kind });
      if (byId.get(r.toId)?.kind === 'interface' && !peer.has(r.toId)) peer.set(r.toId, { id: r.fromId, via: 'link', kind });
    }
  }

  const label = (id?: string) => {
    if (!id) return '';
    const e = byId.get(id);
    if (!e) return '—';
    if (e.kind === 'interface' && e.attrs.deviceId) return `${byId.get(e.attrs.deviceId)?.name ?? '?'} · ${e.name}`;
    return e.name || '—';
  };

  const relsOf = (id: string) => [...(relFrom.get(id) || []), ...(relTo.get(id) || [])];

  const prefixesByVlan = new Map<string, Entity<'prefix'>[]>();
  for (const p of ofKind('prefix')) {
    if (p.attrs.vlanId) prefixesByVlan.set(p.attrs.vlanId, [...(prefixesByVlan.get(p.attrs.vlanId) || []), p]);
  }
  const allIps = ofKind('ipAddress');

  return {
    byId,
    label,
    ipsOf: (id) => ips.get(id) || [],
    portsOf: (id) => ports.get(id) || [],
    peerOf: (id) => peer.get(id),
    relationsOf: (id) => [id, ...(ports.get(id) || []).map((p) => p.id)].flatMap((via) => relsOf(via).map((rel) => ({ rel, via }))),
    runningOn: (id) => (relTo.get(id) || []).filter((r) => r.type === 'runs_on').map((r) => byId.get(r.fromId)).filter(Boolean) as Entity[],
    hostOf: (id) => {
      const r = (relFrom.get(id) || []).find((x) => x.type === 'runs_on');
      return r ? byId.get(r.toId) : undefined;
    },
    childrenOf: (id) => (relFrom.get(id) || []).filter((r) => r.type === 'contains').map((r) => byId.get(r.toId)).filter(Boolean) as Entity[],
    parentOf: (id) => {
      const r = (relTo.get(id) || []).find((x) => x.type === 'contains');
      return r ? byId.get(r.fromId) : undefined;
    },
    prefixesOfVlan: (id) => prefixesByVlan.get(id) || [],
    ipsInPrefix: (id) => {
      const cidr = (byId.get(id) as Entity<'prefix'> | undefined)?.attrs.cidr;
      return cidr ? allIps.filter((ip) => ip.attrs.address && ipInCidr(ip.attrs.address, cidr)) : [];
    },
  };
}
