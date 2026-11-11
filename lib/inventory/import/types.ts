import type { EntityKind, RelationType } from '../types';

/**
 * Импорт: разборщик превращает текст в «черновик» — объекты с естественными ключами
 * (не id реестра). Сверка (reconcile.ts) находит, что из этого уже есть в реестре,
 * и строит план «новое / изменится / без изменений». Спецификация: §8.
 *
 * Ключи: `device:sw-core-01`, `iface:sw-core-01:GigabitEthernet1/0/1`, `vlan:10`,
 * `prefix:default:10.0.10.0/24`, `ip:default:10.0.10.1`, `vrf:MGMT`…
 * Особый ключ `ipowner:<адрес>` — «владелец адреса»: при сверке превращается в объект,
 * которому адрес назначен в реестре (или в сам адрес, если владельца нет).
 */

export interface DraftEntity {
  key: string;
  kind: EntityKind;
  name: string;
  description?: string;
  attrs: Record<string, unknown>;
  /** Поля attrs, значения которых — ключи других черновиков (например, deviceId) */
  refs?: Record<string, string>;
  /** Подсказки для поиска в реестре: серийник, hostname, адрес управления */
  match?: { serial?: string; hostname?: string; mgmtIp?: string };
}

export interface DraftRelation {
  type: RelationType;
  from: string;
  to: string;
  props?: Record<string, unknown>;
}

export interface ImportResult {
  parser: ParserId;
  /** Что разобрали: «sw-core-01 (C9300-48P)» */
  title: string;
  entities: DraftEntity[];
  relations: DraftRelation[];
  warnings: string[];
  /** Сводка для экрана: «12 интерфейсов, 5 VLAN, 2 соседа» */
  stats: Record<string, number>;
}

export type ParserId = 'cisco-ios' | 'huawei-vrp' | 'mikrotik' | 'sockets' | 'proxmox';

export interface ParseOptions {
  /** Для ss/netstat: объект реестра, с которого снят вывод */
  hostEntityId?: string;
  /** Для Proxmox: имя кластера */
  clusterName?: string;
}

export interface Parser {
  id: ParserId;
  label: string;
  /** Подсказка: какие команды вставлять */
  hint: string;
  /** 0..1 — насколько текст похож на этот формат */
  detect: (text: string) => number;
  parse: (text: string, opts: ParseOptions) => ImportResult;
}
