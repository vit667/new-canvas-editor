export type NodeColor = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'purple' | 'default';

// Edge Types - Semantic relationship types
export enum EdgeType {
  DEPENDS_ON = 'depends_on',
  OWNED_BY = 'owned_by',
  USES = 'uses',
  INTEGRATES_WITH = 'integrates_with',
  BLOCKS = 'blocks',
  GENERATES_REVENUE_FOR = 'generates_revenue_for',
  RISK_FOR = 'risk_for',
  MONITORED_BY = 'monitored_by',
  REPORTS_TO = 'reports_to',
  MEMBER_OF = 'member_of',
  DOCUMENTS = 'documents',
  ESCALATED_TO = 'escalated_to',
}

export const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  [EdgeType.DEPENDS_ON]: 'Зависит от',
  [EdgeType.OWNED_BY]: 'Владелец',
  [EdgeType.USES]: 'Использует',
  [EdgeType.INTEGRATES_WITH]: 'Интегрируется с',
  [EdgeType.BLOCKS]: 'Блокирует',
  [EdgeType.GENERATES_REVENUE_FOR]: 'Приносит доход',
  [EdgeType.RISK_FOR]: 'Риск для',
  [EdgeType.MONITORED_BY]: 'Мониторится',
  [EdgeType.REPORTS_TO]: 'Подчиняется',
  [EdgeType.MEMBER_OF]: 'Член группы',
  [EdgeType.DOCUMENTS]: 'Документирует',
  [EdgeType.ESCALATED_TO]: 'Эскалировано к',
};

export const EDGE_TYPE_COLORS: Record<EdgeType, string> = {
  [EdgeType.DEPENDS_ON]: '#ef4444',
  [EdgeType.OWNED_BY]: '#3b82f6',
  [EdgeType.USES]: '#8b5cf6',
  [EdgeType.INTEGRATES_WITH]: '#06b6d4',
  [EdgeType.BLOCKS]: '#dc2626',
  [EdgeType.GENERATES_REVENUE_FOR]: '#10b981',
  [EdgeType.RISK_FOR]: '#f97316',
  [EdgeType.MONITORED_BY]: '#6366f1',
  [EdgeType.REPORTS_TO]: '#ec4899',
  [EdgeType.MEMBER_OF]: '#14b8a6',
  [EdgeType.DOCUMENTS]: '#f59e0b',
  [EdgeType.ESCALATED_TO]: '#a855f7',
};

// Extended Edge with semantic type
export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  type?: string; // 'default', 'custom', etc.
  data?: {
    edgeType?: EdgeType; // Semantic type of relationship
    label?: string;
    description?: string;
  };
  style?: {
    stroke?: string;
    strokeWidth?: number;
  };
}

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
    
    // === System Node Fields ===
    nodeType?: 'system' | 'person' | 'product' | 'risk' | 'external-service' | 'department' | 'flow' | 'document';
    owner?: string; // Person ID - владелец системы
    criticality?: 'critical' | 'high' | 'medium' | 'low'; // Критичность
    environment?: 'prod' | 'uat' | 'test' | 'dev'; // Окружение
    techStack?: string[]; // Технологический стек
    status?: 'active' | 'deprecated' | 'maintenance'; // Статус
    riskLevel?: 'critical' | 'high' | 'medium' | 'low'; // Уровень риска
    sla?: string; // SLA (e.g., "99.9%")
    dependencies?: string[]; // System IDs - зависимости
    
    // === Persona Node Fields ===
    role?: string; // Должность
    department?: string; // Отдел
    accessLevel?: 'admin' | 'power-user' | 'user' | 'viewer'; // Уровень доступа
    workload?: number; // Загруженность (0-100)
    reportsTo?: string; // Person ID - подчиняется
    systemsUsed?: string[]; // System IDs - используемые системы
    riskProfile?: string; // Профиль риска
    
    // === Product Node Fields ===
    sku?: string; // Артикул
    revenue?: number; // Доход
    dependencySystems?: string[]; // System IDs - зависимые системы
    margin?: number; // Маржа (%)
    
    // === Metadata ===
    createdAt?: number; // Timestamp создания
    updatedAt?: number; // Timestamp обновления
    createdBy?: string; // ID создателя
  };
  style?: {
    width?: number;
    height?: number;
  };
}
