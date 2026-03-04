// Типы оборудования
export type EquipmentType = 
  | 'ups'           // ИБП
  | 'access-control' // СКУД
  | 'server'        // Сервер
  | 'storage'       // СХД
  | 'switch'        // Коммутатор
  | 'firewall'      // Фаервол
  | 'access-point'  // Точка доступа
  | 'generic';      // Обычный узел

// ИБП (Источник Бесперебойного Питания)
export interface UPSSpecs {
  capacity: number;           // Емкость в ВА (VA)
  batteryCapacity?: number;   // Емкость батареи в Ач (Ah)
  runtime?: number;           // Время работы в минутах
  outputPorts?: number;       // Количество выходных розеток
  inputVoltage?: string;      // Входное напряжение (например, "220V")
  outputVoltage?: string;     // Выходное напряжение
}

// СКУД (Система Контроля и Управления Доступом)
export interface AccessControlSpecs {
  deviceType: 'camera' | 'reader' | 'face-id' | 'controller'; // Тип устройства
  model?: string;             // Модель устройства
  protocol?: string;          // Протокол (Wiegand, RS-485, TCP/IP)
  readers?: number;           // Количество подключаемых считывателей (для контроллера)
  resolution?: string;        // Разрешение (для камеры)
  poeSupport?: boolean;       // Поддержка PoE
}

// Сервер
export interface ServerSpecs {
  formFactor: 'rack' | 'tower'; // Форм-фактор
  rackUnits?: number;          // Количество юнитов (для rack)
  powerSupplies: number;       // Количество блоков питания
  powerSupplyWattage: number;  // Мощность БП в Ваттах
  cpuModel?: string;           // Модель процессора
  cpuCount: number;            // Количество процессоров
  coresPerCpu: number;         // Ядер на процессор
  ramSize: number;             // ОЗУ в ГБ
  ramType?: string;            // Тип памяти (DDR4, DDR5)
  disks: DiskInfo[];           // Массив дисков
  networkInterfaces: NetworkInterface[]; // Сетевые интерфейсы
  serialPorts?: number;        // Количество Serial портов
}

export interface DiskInfo {
  id: string;
  type: 'hdd' | 'ssd' | 'nvme'; // Тип диска
  capacity: number;             // Емкость в ГБ
  interface?: string;           // Интерфейс (SATA, SAS, NVMe)
  raid?: string;                // RAID конфигурация
}

export interface NetworkInterface {
  id: string;
  type: 'rj45' | 'sfp' | 'sfp+' | 'qsfp'; // Тип интерфейса
  speed: string;                // Скорость (1G, 10G, 25G, 40G, 100G)
  count: number;                // Количество портов
}

// СХД (Система Хранения Данных)
export interface StorageSpecs {
  formFactor: 'rack' | 'tower'; // Форм-фактор
  rackUnits?: number;           // Количество юнитов
  diskSlots: number;            // Количество слотов для дисков
  disks: DiskInfo[];            // Установленные диски
  controllers: number;          // Количество контроллеров
  cacheSize?: number;           // Размер кэша в ГБ
  raidSupport?: string[];       // Поддерживаемые RAID уровни
  networkInterfaces: NetworkInterface[]; // Сетевые интерфейсы
  protocol?: string[];          // Протоколы (iSCSI, FC, NFS, SMB)
}

// Коммутатор/Свитч
export interface SwitchSpecs {
  portCount: number;            // Общее количество портов
  portTypes: PortTypeInfo[];    // Типы портов
  ports?: SwitchPort[];         // Конфигурация портов
  poeSupport: boolean;          // Поддержка PoE
  poePorts?: number;            // Количество PoE портов
  poeWattage?: number;          // Общая мощность PoE в Ваттах
  vlanSupport: boolean;         // Поддержка VLAN
  maxVlans?: number;            // Максимальное количество VLAN
  manageable: boolean;          // Управляемый/неуправляемый
  stackable?: boolean;          // Возможность стекирования
  layer: 2 | 3;                 // Уровень (L2/L3)
}

export interface SwitchPort {
  id: string;
  number: number;               // Номер порта
  mode: 'access' | 'trunk';     // Режим порта
  vlan?: number;                // VLAN для access режима
  allowedVlans?: number[];      // Разрешенные VLAN для trunk
  description?: string;         // Описание порта
  enabled: boolean;             // Включен/выключен
  speed?: string;               // Скорость (auto, 10M, 100M, 1G, 10G)
  duplex?: string;              // Дуплекс (auto, half, full)
  poe?: boolean;                // PoE на этом порту
  connectedTo?: string;         // ID узла к которому подключен
}

export interface PortTypeInfo {
  type: 'rj45' | 'sfp' | 'sfp+' | 'qsfp';
  speed: string;                // Скорость (100M, 1G, 10G, 25G, 40G, 100G)
  count: number;                // Количество портов этого типа
}

// Фаервол
export interface FirewallSpecs {
  throughput: number;           // Пропускная способность в Мбит/с
  maxConnections?: number;      // Максимальное количество одновременных соединений
  vpnSupport: boolean;          // Поддержка VPN
  vpnTunnels?: number;          // Количество VPN туннелей
  interfaces: NetworkInterface[]; // Сетевые интерфейсы
  haSupport?: boolean;          // Поддержка High Availability
  ipsSupport?: boolean;         // Поддержка IPS/IDS
  features?: string[];          // Дополнительные функции
}

// Точка доступа
export interface AccessPointSpecs {
  standard: string[];           // Стандарты Wi-Fi (802.11ac, 802.11ax/Wi-Fi 6)
  frequency: string[];          // Частоты (2.4GHz, 5GHz, 6GHz)
  maxSpeed: string;             // Максимальная скорость
  antennas: number;             // Количество антенн
  mimo?: string;                // MIMO конфигурация (2x2, 4x4, 8x8)
  poeSupport: boolean;          // Поддержка PoE
  poeType?: string;             // Тип PoE (802.3af, 802.3at, 802.3bt)
  maxClients?: number;          // Максимальное количество клиентов
  mounting?: string;            // Тип монтажа (ceiling, wall, outdoor)
}

// Общий тип для всех спецификаций
export type EquipmentSpecs = 
  | UPSSpecs
  | AccessControlSpecs
  | ServerSpecs
  | StorageSpecs
  | SwitchSpecs
  | FirewallSpecs
  | AccessPointSpecs
  | null;

// Расширенные данные узла с типом оборудования
export interface EquipmentNodeData {
  label: string;
  color?: string;
  icon?: string;
  content?: string;
  equipmentType?: EquipmentType;
  equipmentSpecs?: EquipmentSpecs;
  manufacturer?: string;        // Производитель
  model?: string;               // Модель
  serialNumber?: string;        // Серийный номер
  location?: string;            // Местоположение
  ipAddress?: string;           // IP адрес
  macAddress?: string;          // MAC адрес
  purchaseDate?: string;        // Дата покупки
  warrantyExpiry?: string;      // Окончание гарантии
  notes?: string;               // Заметки
}
