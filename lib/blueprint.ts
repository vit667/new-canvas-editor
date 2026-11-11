import { create } from 'zustand';

/**
 * Blueprint-стиль: тёмные инфраструктурные схемы (сети, VLAN, устройства, секции).
 * Справочник сетей хранится в узле типа `networks` (панель «Сети»), поэтому
 * он автоматически попадает в проект, экспорт/импорт и WS-синхронизацию.
 */

export interface BlueprintNetwork {
  id: string;
  /** Метка слева: "VLAN 10", "WireGuard", "WAN" */
  tag: string;
  name: string;
  cidr?: string;
  description?: string;
  color: string;
}

export type LinkSpeed = '100G' | '40G' | '25G' | '10G' | '5G' | '2.5G' | '1G' | '100M';
export type LinkKind = 'access' | 'trunk' | 'wan' | 'kvm' | 'internet' | 'wireless';
export type LinkRouting = 'step' | 'bezier' | 'straight';

export interface LinkEdgeData {
  routing?: LinkRouting;
  kind?: LinkKind;
  speed?: LinkSpeed;
  vlanId?: string;
  label?: string;
  showSpeedLabel?: boolean;
  animated?: boolean;
  /** Ручная точка поворота (координаты холста); пусто — авторазводка по дорожкам */
  centerX?: number;
  centerY?: number;
  /** Где стоит подпись: по центру, у начала или у конца линии */
  labelAt?: 'center' | 'source' | 'target';
}

export const BP = {
  bg: '#0d1117',
  dot: '#2a3240',
  panel: '#151b23',
  panelAlt: '#11161d',
  border: '#2b3542',
  text: '#e6edf3',
  muted: '#8b96a5',
  neutral: '#c9d1d9',
} as const;

export const ACCENT_COLORS: { value: string; label: string }[] = [
  { value: '#4f9cf9', label: 'Синий' },
  { value: '#f0883e', label: 'Оранжевый' },
  { value: '#a371f7', label: 'Фиолетовый' },
  { value: '#3fb950', label: 'Зелёный' },
  { value: '#d29922', label: 'Жёлтый' },
  { value: '#39c5cf', label: 'Бирюзовый' },
  { value: '#f85149', label: 'Красный' },
  { value: '#db61a2', label: 'Розовый' },
  { value: '#8b96a5', label: 'Серый' },
];

export const DEFAULT_NETWORKS: BlueprintNetwork[] = [
  { id: 'lan', tag: 'VLAN 10', name: 'LAN', cidr: '10.0.10.0/24', description: 'доверенная сеть', color: '#4f9cf9' },
  { id: 'dmz', tag: 'VLAN 20', name: 'DMZ', cidr: '10.0.20.0/24', description: 'сервисы, без доступа в LAN', color: '#f0883e' },
  { id: 'guest', tag: 'VLAN 30', name: 'GUEST', cidr: '10.0.30.0/24', description: 'только интернет', color: '#a371f7' },
  { id: 'iot', tag: 'VLAN 40', name: 'IoT', cidr: '10.0.40.0/24', description: 'только интернет', color: '#3fb950' },
  { id: 'mgmt', tag: 'VLAN 99', name: 'MGMT', cidr: '10.0.99.0/24', description: 'интерфейсы управления', color: '#d29922' },
  { id: 'vpn', tag: 'WireGuard', name: 'VPN', cidr: '10.0.50.0/24', description: 'удалённый доступ', color: '#39c5cf' },
  { id: 'wan', tag: 'WAN', name: 'Провайдер', cidr: '192.168.178.0/24', description: 'внешний аплинк', color: '#f85149' },
];

export const SPEED_OPTIONS: { value: LinkSpeed; width: number }[] = [
  { value: '100G', width: 7 },
  { value: '40G', width: 6.5 },
  { value: '25G', width: 6 },
  { value: '10G', width: 5 },
  { value: '5G', width: 4 },
  { value: '2.5G', width: 3.5 },
  { value: '1G', width: 2.5 },
  { value: '100M', width: 1.5 },
];

export const KIND_OPTIONS: { value: LinkKind; label: string; hint: string }[] = [
  { value: 'access', label: 'Access-порт', hint: 'сплошная, цвет VLAN' },
  { value: 'trunk', label: 'Trunk 802.1Q', hint: 'двойная линия, несколько VLAN' },
  { value: 'wan', label: 'WAN', hint: 'внешний аплинк' },
  { value: 'kvm', label: 'Консоль / KVM', hint: 'HDMI + USB, штрих' },
  { value: 'internet', label: 'Через интернет', hint: 'туннель/VPN, пунктир' },
  { value: 'wireless', label: 'Wi-Fi', hint: 'беспроводное подключение, точки' },
];

export const ROUTING_OPTIONS: { value: LinkRouting; label: string }[] = [
  { value: 'step', label: 'Ортогональная' },
  { value: 'bezier', label: 'Кривая' },
  { value: 'straight', label: 'Прямая' },
];

export function speedWidth(speed?: LinkSpeed): number {
  return SPEED_OPTIONS.find((s) => s.value === speed)?.width ?? 2.5;
}

/** Узлы-контейнеры: в них «проваливаются» обычные узлы, они рисуются под связями */
export const CONTAINER_NODE_TYPES = ['group', 'tracked-group', 'section'] as const;
export function isContainerType(type?: string): boolean {
  return !!type && (CONTAINER_NODE_TYPES as readonly string[]).includes(type);
}

/** Полупрозрачная версия hex-цвета */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return hex;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export function newId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Справочник сетей текущего холста (синхронизируется из узлов `networks`) */
interface NetworksState {
  networks: BlueprintNetwork[];
  setNetworks: (networks: BlueprintNetwork[]) => void;
}

export const useNetworksStore = create<NetworksState>((set) => ({
  networks: DEFAULT_NETWORKS,
  setNetworks: (networks) => set({ networks }),
}));

export function collectNetworks(nodes: { type?: string; data?: any }[]): BlueprintNetwork[] {
  const panels = nodes.filter((n) => n.type === 'networks');
  if (panels.length === 0) return DEFAULT_NETWORKS;
  const seen = new Set<string>();
  const result: BlueprintNetwork[] = [];
  for (const p of panels) {
    for (const net of (p.data?.networks as BlueprintNetwork[]) || []) {
      if (!seen.has(net.id)) {
        seen.add(net.id);
        result.push(net);
      }
    }
  }
  return result;
}

export function useNetwork(id?: string): BlueprintNetwork | undefined {
  return useNetworksStore((s) => (id ? s.networks.find((n) => n.id === id) : undefined));
}
