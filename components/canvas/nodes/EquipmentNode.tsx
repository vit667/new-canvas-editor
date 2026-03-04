import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { 
  Server, 
  Zap, 
  Wifi,
  Box,
  Video,
  Router,
  HardDrive,
  EthernetPort
} from 'lucide-react';
import type { EquipmentType } from '@/types/equipment';

interface EquipmentNodeData {
  label: string;
  color?: string;
  equipmentType?: EquipmentType;
  manufacturer?: string;
  model?: string;
  ipAddress?: string;
  [key: string]: any;
}

// Иконки для типов оборудования - используем более специфичные
const equipmentIcons: Record<EquipmentType, any> = {
  'ups': Zap,                    // ИБП - молния
  'access-control': Video,       // СКУД - видео камера
  'server': Server,              // Сервер - сервер
  'storage': HardDrive,          // СХД - жесткий диск
  'switch': EthernetPort,        // Коммутатор - ethernet порт
  'firewall': Router,            // Фаервол - роутер
  'access-point': Wifi,          // Точка доступа - wifi
  'generic': Box,                // Обычный - коробка
};

// Цвета для типов оборудования - более яркие и контрастные
const equipmentColors: Record<EquipmentType, { bg: string; border: string; text: string }> = {
  'ups': { bg: 'bg-gradient-to-br from-yellow-100 to-yellow-200', border: 'border-yellow-500', text: 'text-yellow-800' },
  'access-control': { bg: 'bg-gradient-to-br from-blue-100 to-blue-200', border: 'border-blue-500', text: 'text-blue-800' },
  'server': { bg: 'bg-gradient-to-br from-purple-100 to-purple-200', border: 'border-purple-500', text: 'text-purple-800' },
  'storage': { bg: 'bg-gradient-to-br from-indigo-100 to-indigo-200', border: 'border-indigo-500', text: 'text-indigo-800' },
  'switch': { bg: 'bg-gradient-to-br from-green-100 to-green-200', border: 'border-green-500', text: 'text-green-800' },
  'firewall': { bg: 'bg-gradient-to-br from-red-100 to-red-200', border: 'border-red-500', text: 'text-red-800' },
  'access-point': { bg: 'bg-gradient-to-br from-cyan-100 to-cyan-200', border: 'border-cyan-500', text: 'text-cyan-800' },
  'generic': { bg: 'bg-gradient-to-br from-gray-100 to-gray-200', border: 'border-gray-500', text: 'text-gray-800' },
};

// Названия типов на русском
const equipmentTypeNames: Record<EquipmentType, string> = {
  'ups': 'ИБП',
  'access-control': 'СКУД',
  'server': 'Сервер',
  'storage': 'СХД',
  'switch': 'Коммутатор',
  'firewall': 'Фаервол',
  'access-point': 'Точка доступа',
  'generic': 'Узел',
};

function EquipmentNode({ data, selected }: NodeProps<EquipmentNodeData>) {
  const equipmentType = data.equipmentType || 'generic';
  const Icon = equipmentIcons[equipmentType];
  const colors = equipmentColors[equipmentType];
  const typeName = equipmentTypeNames[equipmentType];

  // Получаем краткую информацию в зависимости от типа
  const getShortInfo = () => {
    if (!data.equipmentSpecs) return null;

    switch (equipmentType) {
      case 'server':
        const serverSpecs = data.equipmentSpecs as any;
        return `${serverSpecs.cpuCount}x CPU, ${serverSpecs.ramSize}GB RAM`;
      
      case 'switch':
        const switchSpecs = data.equipmentSpecs as any;
        return `${switchSpecs.portCount} портов${switchSpecs.poeSupport ? ', PoE' : ''}`;
      
      case 'ups':
        const upsSpecs = data.equipmentSpecs as any;
        return `${upsSpecs.capacity} ВА`;
      
      case 'storage':
        const storageSpecs = data.equipmentSpecs as any;
        return `${storageSpecs.diskSlots} слотов`;
      
      case 'firewall':
        const fwSpecs = data.equipmentSpecs as any;
        return `${fwSpecs.throughput} Мбит/с`;
      
      case 'access-point':
        const apSpecs = data.equipmentSpecs as any;
        return apSpecs.standard?.join(', ') || 'Wi-Fi';
      
      default:
        return null;
    }
  };

  const shortInfo = getShortInfo();

  // Определяем специфичный стиль для каждого типа
  const getNodeStyle = () => {
    switch (equipmentType) {
      case 'server':
        // Сервер - прямоугольный с полосками (имитация rack)
        return 'rounded-md';
      case 'switch':
        // Коммутатор - широкий и плоский
        return 'rounded-lg';
      case 'firewall':
        // Фаервол - с острыми углами (защита)
        return 'rounded-sm';
      case 'ups':
        // ИБП - закругленный (батарея)
        return 'rounded-2xl';
      case 'access-point':
        // Точка доступа - круглая
        return 'rounded-full';
      case 'storage':
        // СХД - квадратный (стек дисков)
        return 'rounded-md';
      case 'access-control':
        // СКУД - скругленный
        return 'rounded-xl';
      default:
        return 'rounded-lg';
    }
  };

  const nodeStyle = getNodeStyle();

  // Специальные визуальные элементы для разных типов
  const renderSpecialElements = () => {
    switch (equipmentType) {
      case 'access-control':
        // Индикатор записи для камеры
        return (
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></div>
          </div>
        );
      case 'server':
        // Полоски для имитации rack сервера
        return (
          <div className="absolute left-0 top-0 bottom-0 w-1 flex flex-col gap-1 p-1">
            <div className="flex-1 bg-gray-400 rounded-full"></div>
            <div className="flex-1 bg-gray-400 rounded-full"></div>
            <div className="flex-1 bg-gray-400 rounded-full"></div>
          </div>
        );
      case 'switch':
        // Реальные порты коммутатора с индикацией
        const switchSpecs = data.equipmentSpecs as any;
        const ports = switchSpecs?.ports || [];
        const portCount = switchSpecs?.portCount || 24;
        
        // Если портов нет, показываем простую визуализацию
        if (ports.length === 0) {
          const portsPerRow = Math.ceil(portCount / 2);
          return (
            <div className="absolute bottom-2 left-2 right-2">
              <div className="flex gap-0.5 mb-1">
                {[...Array(portsPerRow)].map((_, i) => (
                  <div key={i} className="flex-1 h-1.5 bg-gray-400 rounded-sm border border-gray-500"></div>
                ))}
              </div>
              <div className="flex gap-0.5">
                {[...Array(portCount - portsPerRow)].map((_, i) => (
                  <div key={i} className="flex-1 h-1.5 bg-gray-400 rounded-sm border border-gray-500"></div>
                ))}
              </div>
            </div>
          );
        }
        
        // Показываем реальные порты с их статусами
        const portsPerRow = Math.ceil(portCount / 2);
        const row1 = ports.slice(0, portsPerRow);
        const row2 = ports.slice(portsPerRow);
        
        const getPortColor = (port: any) => {
          if (!port.enabled) return 'bg-gray-400 border-gray-500';
          if (port.connectedTo) return 'bg-green-500 border-green-600';
          if (port.mode === 'trunk') return 'bg-blue-500 border-blue-600';
          return 'bg-yellow-500 border-yellow-600';
        };
        
        return (
          <div className="absolute bottom-2 left-2 right-2">
            {/* Первый ряд портов */}
            <div className="flex items-center gap-1 mb-1">
              <div className="text-[8px] text-gray-600 font-mono w-4">1-{portsPerRow}</div>
              <div className="flex-1 flex gap-0.5">
                {row1.map((port: any) => (
                  <div 
                    key={port.id} 
                    className={`flex-1 h-2 rounded-sm border ${getPortColor(port)}`}
                    title={`Порт ${port.number}: ${port.description || 'N/A'}\nVLAN: ${port.vlan || 'N/A'}\nРежим: ${port.mode}`}
                  ></div>
                ))}
              </div>
            </div>
            {/* Второй ряд портов */}
            {row2.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="text-[8px] text-gray-600 font-mono w-4">{portsPerRow + 1}-{portCount}</div>
                <div className="flex-1 flex gap-0.5">
                  {row2.map((port: any) => (
                    <div 
                      key={port.id} 
                      className={`flex-1 h-2 rounded-sm border ${getPortColor(port)}`}
                      title={`Порт ${port.number}: ${port.description || 'N/A'}\nVLAN: ${port.vlan || 'N/A'}\nРежим: ${port.mode}`}
                    ></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'firewall':
        // Диагональные полосы для защиты
        return (
          <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
            <div className="absolute inset-0" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 2px, transparent 2px, transparent 8px)',
            }}></div>
          </div>
        );
      case 'storage':
        // Стек дисков
        return (
          <div className="absolute left-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-1 h-1 bg-indigo-500 rounded-sm border border-indigo-600"></div>
            ))}
          </div>
        );
      case 'access-point':
        // Волны Wi-Fi
        return (
          <div className="absolute -top-1 -right-1">
            <div className="relative">
              <div className="absolute w-4 h-4 border-2 border-cyan-400 rounded-full animate-ping"></div>
              <div className="w-4 h-4 border-2 border-cyan-500 rounded-full"></div>
            </div>
          </div>
        );
      case 'ups':
        // Индикатор заряда
        return (
          <div className="absolute top-2 right-2 flex gap-0.5">
            <div className="w-1 h-3 bg-green-500 rounded-full"></div>
            <div className="w-1 h-3 bg-green-500 rounded-full"></div>
            <div className="w-1 h-3 bg-green-400 rounded-full"></div>
            <div className="w-1 h-3 bg-gray-300 rounded-full"></div>
          </div>
        );
      default:
        return null;
    }
  };

  // Определяем ширину узла в зависимости от типа
  const getNodeWidth = () => {
    if (equipmentType === 'switch') {
      const switchSpecs = data.equipmentSpecs as any;
      const portCount = switchSpecs?.portCount || 24;
      // Чем больше портов, тем шире узел
      if (portCount > 48) return 'min-w-[400px] max-w-[500px]';
      if (portCount > 24) return 'min-w-[350px] max-w-[450px]';
      return 'min-w-[300px] max-w-[400px]';
    }
    return 'min-w-[200px] max-w-[280px]';
  };

  return (
    <div
      className={`
        relative px-4 py-3 border-2 shadow-lg
        ${getNodeWidth()}
        ${nodeStyle}
        ${colors.bg} ${colors.border}
        ${selected ? 'ring-4 ring-blue-500 ring-offset-2 scale-105' : ''}
        transition-all duration-200 hover:shadow-xl hover:scale-102
        ${equipmentType === 'access-point' ? 'aspect-square flex flex-col items-center justify-center' : ''}
      `}
    >
      {/* Специальные визуальные элементы */}
      {renderSpecialElements()}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500 border-2 border-white shadow-md"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500 border-2 border-white shadow-md"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-blue-500 border-2 border-white shadow-md"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-blue-500 border-2 border-white shadow-md"
      />

      {/* Header с иконкой и типом */}
      <div className="flex items-center gap-2 mb-2 relative z-10">
        <div className={`p-2 rounded-lg ${colors.bg} border-2 ${colors.border} shadow-sm`}>
          <Icon className={`w-6 h-6 ${colors.text}`} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-bold ${colors.text} uppercase tracking-wider`}>
            {typeName}
          </div>
        </div>
      </div>

      {/* Название */}
      <div className="font-bold text-base mb-2 text-gray-900 truncate relative z-10">
        {data.label}
      </div>

      {/* Производитель и модель */}
      {(data.manufacturer || data.model) && (
        <div className="text-xs text-gray-700 mb-2 truncate bg-white/50 px-2 py-1 rounded relative z-10">
          {data.manufacturer && <span className="font-semibold">{data.manufacturer}</span>}
          {data.manufacturer && data.model && <span> • </span>}
          {data.model && <span>{data.model}</span>}
        </div>
      )}

      {/* Краткая информация о характеристиках */}
      {shortInfo && (
        <div className={`text-sm ${colors.text} font-bold mb-2 px-2 py-1 bg-white/70 rounded-md relative z-10`}>
          {shortInfo}
        </div>
      )}

      {/* Дополнительное место для портов коммутатора */}
      {equipmentType === 'switch' && (
        <div className="h-8 mb-2"></div>
      )}

      {/* IP адрес */}
      {data.ipAddress && (
        <div className="text-xs text-gray-700 font-mono bg-white px-2 py-1.5 rounded-md border-2 border-gray-300 shadow-sm relative z-10">
          🌐 {data.ipAddress}
        </div>
      )}

      {/* Местоположение */}
      {data.location && (
        <div className="text-xs text-gray-600 mt-2 truncate bg-white/50 px-2 py-1 rounded relative z-10">
          📍 {data.location}
        </div>
      )}
    </div>
  );
}

export default memo(EquipmentNode);
