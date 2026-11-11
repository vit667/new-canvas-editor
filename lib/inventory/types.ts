/**
 * Реестр инфраструктуры — типы. Спецификация: docs/INVENTORY_MODEL.md
 * Модуль намеренно без зависимостей от React / React Flow: его можно перенести
 * в team/webapp или на сервер как есть.
 */

export type EntityKind =
  | 'site' | 'rack'
  | 'device' | 'module' | 'interface' | 'cable'
  | 'vrf' | 'vlan' | 'prefix' | 'ipAddress' | 'natRule' | 'flow'
  | 'cluster' | 'host' | 'vm' | 'container' | 'datastore'
  | 'software' | 'dbInstance' | 'service' | 'external' | 'product'
  /** Логическая группа (секция схемы, пока не уточнён тип: хост / кластер / площадка) */
  | 'group';

export type EntityStatus = 'planned' | 'active' | 'maintenance' | 'retired';

/** Откуда взялся объект или связь. refs — id схем (проектов), из которых он выведен */
export interface EntitySource {
  type: 'manual' | 'diagram' | 'import';
  refs?: string[];
  at?: string;
}

/** Поля по видам объектов. Все необязательные: объект можно заполнять постепенно */
export interface AttrsMap {
  site: { address?: string; timezone?: string };
  rack: { siteId?: string; units?: number; position?: string };
  device: {
    role?: string;
    vendor?: string;
    model?: string;
    serial?: string;
    assetTag?: string;
    platform?: string;
    hostname?: string;
    rackId?: string;
    unit?: number;
    stack?: { stackId: string; member: number; priority?: number };
    vlanId?: string;
    icon?: string;
  };
  module: { deviceId?: string; slot?: string; model?: string; serial?: string };
  interface: {
    deviceId?: string;
    type?: 'rj45' | 'sfp' | 'sfp+' | 'qsfp' | 'virtual' | 'lag' | 'wireless';
    speed?: string;
    mtu?: number;
    mode?: 'access' | 'trunk' | 'routed';
    untaggedVlanId?: string;
    taggedVlanIds?: string[];
    lagId?: string;
    enabled?: boolean;
    mac?: string;
    order?: number;
  };
  cable: {
    aInterfaceId?: string;
    bInterfaceId?: string;
    type?: 'copper' | 'fiber' | 'dac' | 'wireless';
    speed?: string;
    length?: string;
    label?: string;
    vlanId?: string;
    mode?: 'access' | 'trunk';
  };
  vrf: { rd?: string };
  vlan: { vid?: number; color?: string; siteId?: string; tag?: string };
  prefix: {
    cidr?: string;
    vrfId?: string;
    vlanId?: string;
    role?: string;
    gateway?: string;
    dhcpRanges?: { start: string; end: string }[];
    isPool?: boolean;
  };
  ipAddress: {
    address?: string;
    vrfId?: string;
    interfaceId?: string;
    /** Упрощённая привязка без интерфейса: устройство / ВМ / сервис */
    assignedToId?: string;
    role?: 'primary' | 'secondary' | 'vip' | 'anycast' | 'gateway';
    dnsName?: string;
    vlanId?: string;
  };
  natRule: {
    type?: 'dnat' | 'snat' | 'static' | 'masquerade';
    outside?: { ipId?: string; cidr?: string; ports?: string };
    inside?: { ipId?: string; ports?: string };
    protocol?: 'tcp' | 'udp' | 'tcp/udp' | 'any';
    deviceId?: string;
  };
  flow: {
    srcId?: string;
    dstId?: string;
    dstPort?: number;
    protocol?: 'tcp' | 'udp';
    observedBy?: 'ss' | 'netstat' | 'firewall' | 'manual';
    firstSeen?: string;
    lastSeen?: string;
    count?: number;
  };
  cluster: { type?: 'vcenter' | 'proxmox' | 'nutanix' | 'kvm' | 'k8s' | 'hyperv'; managerUrl?: string };
  host: { deviceId?: string; hypervisor?: string; version?: string };
  vm: { vcpu?: number; ramMb?: number; os?: string; vmid?: string; disks?: { name: string; sizeGb: number }[] };
  container: { runtime?: 'lxc' | 'docker' | 'k8s-pod'; image?: string; vmid?: string };
  datastore: { type?: string; capacityGb?: number; usedGb?: number };
  software: {
    product?: string;
    version?: string;
    role?: 'database' | 'runtime' | 'webserver' | 'agent' | 'exporter' | 'backup-agent' | 'remote-access' | 'app';
    listenPorts?: string[];
    url?: string;
    icon?: string;
  };
  dbInstance: { engine?: string; sid?: string; port?: number; databases?: string[] };
  service: { url?: string; ref?: string; subtitle?: string; criticality?: 'low' | 'medium' | 'high' | 'critical'; lanOnly?: boolean; icon?: string; vlanId?: string };
  external: { provider?: string; url?: string; note?: string; bandwidth?: { down?: string; up?: string }; icon?: string };
  product: { category?: string; icon?: string; vendor?: string };
  group: { role?: string; subtitle?: string; tag?: string; icon?: string; vlanId?: string; hostname?: string };
}

export interface BaseEntity {
  id: string;
  name: string;
  tags?: string[];
  description?: string;
  status?: EntityStatus;
  owner?: string;
  custom?: Record<string, string>;
  source?: EntitySource;
  createdAt: string;
  updatedAt: string;
}

export type Entity<K extends EntityKind = EntityKind> = K extends EntityKind
  ? BaseEntity & { kind: K; attrs: AttrsMap[K] }
  : never;

/** Объект на вход (даты и источник проставляет репозиторий) */
export type EntityInput<K extends EntityKind = EntityKind> = K extends EntityKind
  ? Omit<BaseEntity, 'createdAt' | 'updatedAt'> & { kind: K; attrs: AttrsMap[K]; createdAt?: string; updatedAt?: string }
  : never;

export type RelationType =
  | 'contains'
  | 'runs_on'
  | 'depends_on'
  | 'monitored_by'
  | 'backed_up_by'
  | 'managed_by'
  | 'accessed_via'
  | 'logs_to'
  | 'talks_to'
  /** Связь со схемы без детализации до портов (устройство ↔ устройство, Wi-Fi, консоль, туннель) */
  | 'connected_to';

export interface Relation {
  id: string;
  type: RelationType;
  fromId: string;
  toId: string;
  props?: Record<string, unknown>;
  source?: EntitySource;
}

export type Change =
  | { op: 'upsert'; entity: EntityInput }
  | { op: 'delete'; id: string }
  | { op: 'link'; relation: Relation }
  | { op: 'unlink'; id: string };

export interface InventoryState {
  version: 1;
  entities: Record<string, Entity>;
  relations: Record<string, Relation>;
}

export type IssueLevel = 'error' | 'warning';

export interface ValidationIssue {
  level: IssueLevel;
  rule: string;
  message: string;
  entityIds: string[];
}

export interface ApplyResult {
  ok: boolean;
  /** Ошибки блокируют весь пакет изменений; предупреждения — нет */
  issues: ValidationIssue[];
  changedIds: string[];
}

export interface ChangeEvent {
  origin: string;
  changedIds: string[];
}

export const KIND_LABELS: Record<EntityKind, string> = {
  site: 'Площадка',
  rack: 'Стойка',
  device: 'Устройство',
  module: 'Модуль',
  interface: 'Интерфейс',
  cable: 'Кабель',
  vrf: 'VRF',
  vlan: 'VLAN',
  prefix: 'Подсеть',
  ipAddress: 'IP-адрес',
  natRule: 'NAT-правило',
  flow: 'Поток',
  cluster: 'Кластер',
  host: 'Хост',
  vm: 'ВМ',
  container: 'Контейнер',
  datastore: 'Хранилище',
  software: 'ПО',
  dbInstance: 'СУБД',
  service: 'Сервис',
  external: 'Внешняя система',
  product: 'Продукт',
  group: 'Группа',
};

export const RELATION_LABELS: Record<RelationType, string> = {
  contains: 'содержит',
  runs_on: 'работает на',
  depends_on: 'зависит от',
  monitored_by: 'мониторится через',
  backed_up_by: 'бэкапится через',
  managed_by: 'управляется через',
  accessed_via: 'доступ через',
  logs_to: 'логи в',
  talks_to: 'общается с',
  connected_to: 'подключено к',
};
