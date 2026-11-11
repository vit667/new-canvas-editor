import type { EntityKind } from '@/lib/inventory/types';

/**
 * Навигация приложения — единый источник для меню, хлебных крошек и страниц реестра.
 *
 *   /schemes                 список схем
 *   /schemes/[id]            редактор схемы
 *   /inventory/[section]     таблица раздела реестра (с фильтром по схеме)
 *   /issues                  проблемы реестра
 */

export interface InventorySection {
  slug: string;
  label: string;
  /** Одно слово для заголовка страницы и поиска */
  title: string;
  description: string;
  kind: EntityKind;
  /** Иконка в формате AppIcon (lucide-ключ из lib/canvas-icons, ci:…, si:…) */
  icon: string;
}

export interface NavArea {
  id: string;
  label: string;
  icon: string;
  sections: (InventorySection | { slug: string; label: string; soon: true })[];
}

export const INVENTORY_SECTIONS: InventorySection[] = [
  { slug: 'devices', label: 'Устройства', title: 'Устройства', kind: 'device', icon: 'server',
    description: 'Физическое оборудование: роль, модель, платформа, адрес управления, порты.' },
  { slug: 'ports', label: 'Порты', title: 'Порты', kind: 'interface', icon: 'ethernetport',
    description: 'Интерфейсы устройств: режим, VLAN, скорость и что к ним подключено.' },
  { slug: 'cables', label: 'Кабели и связи', title: 'Кабели и связи', kind: 'cable', icon: 'cable',
    description: 'Кабели порт↔порт и подключения со схем.' },
  { slug: 'vlans', label: 'VLAN', title: 'VLAN', kind: 'vlan', icon: 'network',
    description: 'Сети второго уровня: VID, цвет, подсети.' },
  { slug: 'prefixes', label: 'Подсети', title: 'Подсети', kind: 'prefix', icon: 'layers',
    description: 'Подсети (CIDR) и их VLAN.' },
  { slug: 'ip', label: 'IP-адреса', title: 'IP-адреса', kind: 'ipAddress', icon: 'hash',
    description: 'Назначенные адреса: кому принадлежат, DNS-имя, VLAN.' },
  { slug: 'services', label: 'Сервисы', title: 'Сервисы', kind: 'service', icon: 'boxes',
    description: 'Приложения и стеки: адреса, контейнеры/ВМ, что на них работает.' },
  { slug: 'software', label: 'ПО', title: 'ПО', kind: 'software', icon: 'package',
    description: 'Установленное ПО и компоненты стеков.' },
  { slug: 'external', label: 'Внешние системы', title: 'Внешние системы', kind: 'external', icon: 'globe',
    description: 'SaaS, облака и провайдеры.' },
  { slug: 'groups', label: 'Группы', title: 'Группы', kind: 'group', icon: 'layers',
    description: 'Секции схем: серверы, зоны, логические группы.' },
];

export const sectionBySlug = (slug: string) => INVENTORY_SECTIONS.find((s) => s.slug === slug);
export const sectionByKind = (kind: EntityKind) => INVENTORY_SECTIONS.find((s) => s.kind === kind);
const sec = (slug: string) => sectionBySlug(slug)!;

/** Разделы реестра в меню. «Скоро» — запланированные этапы (docs/INVENTORY_MODEL.md §9) */
export const INVENTORY_AREAS: NavArea[] = [
  { id: 'hardware', label: 'Оборудование', icon: 'server', sections: [sec('devices'), sec('ports'), sec('cables')] },
  {
    id: 'network', label: 'Сеть', icon: 'network',
    sections: [sec('vlans'), sec('prefixes'), sec('ip'), { slug: 'ipam', label: 'IPAM', soon: true }, { slug: 'nat', label: 'NAT и потоки', soon: true }],
  },
  { id: 'apps', label: 'Сервисы', icon: 'boxes', sections: [sec('services'), sec('software'), sec('external'), sec('groups')] },
  {
    id: 'compute', label: 'Вычисления', icon: 'cpu',
    sections: [{ slug: 'clusters', label: 'Кластеры', soon: true }, { slug: 'hosts', label: 'Хосты', soon: true }, { slug: 'vms', label: 'ВМ и контейнеры', soon: true }],
  },
];

export const schemeHref = (id: string) => `/schemes/${encodeURIComponent(id)}`;
export const inventoryHref = (slug: string, params?: { scheme?: string; id?: string }) => {
  const q = new URLSearchParams();
  if (params?.scheme) q.set('scheme', params.scheme);
  if (params?.id) q.set('id', params.id);
  const s = q.toString();
  return `/inventory/${slug}${s ? `?${s}` : ''}`;
};
