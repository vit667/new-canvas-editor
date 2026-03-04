export type NodeColor = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'purple' | 'default';

export interface CustomField {
  id: string;
  key: string;
  value: string;
  icon?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  icon?: string;
  port?: string;
  description?: string;
  location?: string;
  startCommand?: string;
  customFields?: CustomField[];
}

export interface ScannedPort {
  port: number;
  protocol: 'tcp' | 'udp';
  service?: string;
  status: 'open' | 'closed' | 'filtered';
}

export interface PortMapping {
  port: number;
  serviceId: string;
  serviceName: string;
}

export interface ScannedHost {
  ip: string;
  hostname?: string;
  mac?: string;
  status: 'up' | 'down';
}

export interface CanvasNode {
  id: string;
  type: 'text' | 'group' | 'tracked' | 'tracked-group';
  position: { x: number; y: number };
  data: {
    label: string;
    content?: string;
    color?: NodeColor;
    icon?: string;
    services?: ServiceItem[];
    customFields?: CustomField[];
    // Для tracked узлов
    host?: string; // IP или hostname для сканирования
    hostStatus?: 'unknown' | 'online' | 'offline'; // Статус доступности хоста
    scannedPorts?: ScannedPort[];
    portMappings?: PortMapping[]; // Маппинг портов к сервисам
    lastScanned?: number; // Timestamp последнего сканирования
    lastPinged?: number; // Timestamp последней проверки ping
    // Для tracked-group
    networkRange?: string; // Диапазон сети, например "172.16.8.0/24" или "172.16.8.1-100"
    scannedHosts?: ScannedHost[]; // Найденные хосты в сети
    lastNetworkScan?: number; // Timestamp последнего сканирования сети
    autoCreateNodes?: boolean; // Автоматически создавать узлы для найденных хостов
  };
  style?: {
    width?: number;
    height?: number;
  };
}
