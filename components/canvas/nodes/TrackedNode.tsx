import { memo, useState, useEffect } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { getIconComponent } from '@/lib/canvas-icons';
import type { ServiceItem, CustomField, ScannedPort, PortMapping } from '@/types/canvas';
import ServicePopup from '@/components/canvas/ServicePopup';
import { ArrowLeftRight, RefreshCw, Network, MapPin, Activity, AlertCircle } from 'lucide-react';
import { scanPorts } from '@/lib/portScanner';
import { pingHost } from '@/lib/networkUtils';
import { Button } from '@/components/ui/button';

const colorClasses = {
  red: 'bg-red-100 border-red-500 text-red-900',
  orange: 'bg-orange-100 border-orange-500 text-orange-900',
  yellow: 'bg-yellow-100 border-yellow-500 text-yellow-900',
  green: 'bg-green-100 border-green-500 text-green-900',
  cyan: 'bg-cyan-100 border-cyan-500 text-cyan-900',
  purple: 'bg-purple-100 border-purple-500 text-purple-900',
  default: 'bg-white border-gray-300 text-gray-900',
};

function TrackedNode({ data, selected, id }: NodeProps) {
  const color = (data.color as keyof typeof colorClasses) || 'default';
  const IconComponent = getIconComponent(data.icon);
  const services = (data.services as ServiceItem[]) || [];
  const customFields = (data.customFields as CustomField[]) || [];
  const portMappings = (data.portMappings as PortMapping[]) || [];
  const host = data.host || 'localhost';
  const scannedPortsFromData = (data.scannedPorts as ScannedPort[]) || [];
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [hostStatus, setHostStatus] = useState<'unknown' | 'online' | 'offline'>(
    (data.hostStatus as 'unknown' | 'online' | 'offline') || 'unknown'
  );
  const [lastScanned, setLastScanned] = useState<number | undefined>(data.lastScanned);
  // @ts-ignore - используется для обновления, но не читается
  const [lastPinged, setLastPinged] = useState<number | undefined>(data.lastPinged);
  const [scanError, setScanError] = useState<string | null>(null);
  const [localScannedPorts, setLocalScannedPorts] = useState<ScannedPort[]>(scannedPortsFromData);

  // Синхронизируем scannedPorts с данными узла
  useEffect(() => {
    setLocalScannedPorts(scannedPortsFromData);
    setLastScanned(data.lastScanned);
    setLastPinged(data.lastPinged);
    if (data.hostStatus) {
      setHostStatus(data.hostStatus as 'unknown' | 'online' | 'offline');
    }
  }, [scannedPortsFromData, data.lastScanned, data.lastPinged, data.hostStatus]);

  // Проверка доступности хоста при монтировании
  useEffect(() => {
    if (host && hostStatus === 'unknown') {
      handlePing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host]);

  // Проверка доступности хоста через ping
  const handlePing = async () => {
    if (!host) return;
    
    setIsPinging(true);
    try {
      const result = await pingHost(host);
      const isOnline = result.success;
      setHostStatus(isOnline ? 'online' : 'offline');
      
      // Обновляем данные узла
      const event = new CustomEvent('updateNodeData', {
        detail: {
          nodeId: id,
          data: {
            hostStatus: isOnline ? 'online' : 'offline',
            lastPinged: Date.now(),
          },
        },
      });
      window.dispatchEvent(event);
      setLastPinged(Date.now());
    } catch (error) {
      setHostStatus('offline');
      console.error('Ping failed:', error);
    } finally {
      setIsPinging(false);
    }
  };

  // Сканирование портов
  const handleScan = async () => {
    if (!host) return;
    
    setIsScanning(true);
    setScanError(null);
    try {
      const ports = await scanPorts(host);
      // Обновляем узел через родительский компонент
      const event = new CustomEvent('updateNodeData', {
        detail: {
          nodeId: id,
          data: {
            scannedPorts: ports,
            lastScanned: Date.now(),
          },
        },
      });
      window.dispatchEvent(event);
      setLocalScannedPorts(ports);
      setLastScanned(Date.now());
    } catch (error: any) {
      console.error('Port scan failed:', error);
      setScanError(error?.message || 'Ошибка сканирования портов');
      setLocalScannedPorts([]);
    } finally {
      setIsScanning(false);
    }
  };

  // Получаем сервис для порта (из маппинга или автодетект)
  const getServiceForPort = (port: number): ServiceItem | undefined => {
    const mapping = portMappings.find(m => m.port === port);
    if (mapping) {
      return services.find(s => s.id === mapping.serviceId);
    }
    return undefined;
  };

  // Получаем маппинг для порта
  // @ts-ignore - может использоваться в будущем
  const getMappingForPort = (port: number): PortMapping | undefined => {
    return portMappings.find(m => m.port === port);
  };

  return (
    <>
      <ServicePopup
        service={selectedService}
        isOpen={!!selectedService}
        onClose={() => setSelectedService(null)}
      />
      <div
        className={cn(
          'px-4 py-2 rounded-lg border-2 min-w-[250px] max-w-[350px] transition-all cursor-pointer',
          colorClasses[color],
          selected && 'ring-2 ring-blue-500 ring-offset-2'
        )}
      >
        {/* Handles со всех 4 сторон */}
        <Handle type="target" position={Position.Top} id="top-target" />
        <Handle type="source" position={Position.Top} id="top-source" />
        <Handle type="target" position={Position.Bottom} id="bottom-target" />
        <Handle type="source" position={Position.Bottom} id="bottom-source" />
        <Handle type="target" position={Position.Left} id="left-target" />
        <Handle type="source" position={Position.Left} id="left-source" />
        <Handle type="target" position={Position.Right} id="right-target" />
        <Handle type="source" position={Position.Right} id="right-source" />

        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          {IconComponent && <IconComponent className="w-4 h-4 flex-shrink-0" />}
          <div className="font-medium text-sm flex-1">{data.label}</div>
          <div title="Отслеживаемый узел">
            <Network className="w-3.5 h-3.5 text-blue-600" />
          </div>
        </div>

        {/* Host Status */}
        <div className="text-xs mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            <span className="font-mono">{host}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {hostStatus === 'online' && (
              <div className="flex items-center gap-1 text-green-600">
                <Activity className="w-3 h-3" />
                <span>Online</span>
              </div>
            )}
            {hostStatus === 'offline' && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-3 h-3" />
                <span>Offline</span>
              </div>
            )}
            {hostStatus === 'unknown' && (
              <div className="flex items-center gap-1 text-gray-500">
                <Activity className={cn('w-3 h-3', isPinging && 'animate-pulse')} />
                <span>Проверка...</span>
              </div>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePing}
              disabled={isPinging}
              className="h-5 px-1.5 text-xs"
              title="Проверить доступность"
            >
              <RefreshCw className={cn('w-3 h-3', isPinging && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Description */}
        {data.content && (
          <div className="text-xs mt-1 mb-2 opacity-80">{data.content}</div>
        )}

        {/* Scan Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-600 flex-1">
            {scanError ? (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-3 h-3" />
                <span className="truncate" title={scanError}>{scanError}</span>
              </div>
            ) : localScannedPorts.length > 0 ? (
              <>
                Открыто портов: <span className="font-semibold">{localScannedPorts.length}</span>
                {lastScanned && (
                  <span className="ml-2 text-gray-500">
                    ({new Date(lastScanned).toLocaleTimeString()})
                  </span>
                )}
              </>
            ) : (
              <span>Порты не сканированы</span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleScan}
            disabled={isScanning || hostStatus === 'offline'}
            className="h-6 px-2 text-xs"
            title={hostStatus === 'offline' ? 'Хост недоступен' : 'Сканировать порты'}
          >
            <RefreshCw className={cn('w-3 h-3', isScanning && 'animate-spin')} />
          </Button>
        </div>

        {/* Scanned Ports */}
        {localScannedPorts.length > 0 && (
          <div className="mt-2 space-y-1 border-t pt-2">
            <div className="text-xs font-semibold mb-1">Открытые порты:</div>
            {localScannedPorts.map((scannedPort) => {
              const mappedService = getServiceForPort(scannedPort.port);

              return (
                <div
                  key={scannedPort.port}
                  className="text-xs p-1.5 rounded bg-white bg-opacity-50 flex items-center gap-2"
                >
                  <span className="font-mono font-semibold min-w-[50px]">
                    {scannedPort.port}
                  </span>
                  {scannedPort.service && (
                    <span className="text-gray-600">({scannedPort.service})</span>
                  )}
                  <ArrowLeftRight className="w-3 h-3 text-gray-400" />
                  {mappedService ? (
                    <button
                      onClick={() => setSelectedService(mappedService)}
                      className="flex-1 text-left font-medium text-blue-700 hover:underline truncate"
                    >
                      {mappedService.name}
                    </button>
                  ) : (
                    <span className="flex-1 text-gray-500 italic">Не привязан</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Services (привязанные) */}
        {services.length > 0 && (
          <div className="mt-2 space-y-1 border-t pt-2">
            <div className="text-xs font-semibold mb-1">Сервисы:</div>
            {services.map((service) => {
              const ServiceIcon = getIconComponent(service.icon);
              const mappedPort = portMappings.find(m => m.serviceId === service.id);
              return (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className="w-full flex items-center gap-1.5 text-xs p-1.5 rounded bg-white bg-opacity-50 hover:bg-opacity-100 hover:shadow-sm transition-all cursor-pointer"
                >
                  {ServiceIcon && (
                    <ServiceIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span className="font-medium truncate flex-1 text-left">
                    {service.name}
                  </span>
                  {mappedPort && (
                    <>
                      <ArrowLeftRight className="w-3 h-3 flex-shrink-0 text-gray-500" />
                      <span className="font-mono text-[11px] text-gray-700">
                        {mappedPort.port}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Custom Fields */}
        {customFields.length > 0 && (
          <div className="mt-2 space-y-1 border-t pt-2">
            {customFields.map((field) => {
              if (!field.key) return null;
              const FieldIcon = getIconComponent(field.icon);
              return (
                <div
                  key={field.id}
                  className="text-xs flex gap-1.5 items-start opacity-75"
                >
                  {FieldIcon && (
                    <FieldIcon className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  )}
                  <span className="font-medium">{field.key}:</span>
                  <span className="flex-1 break-words">{field.value || ''}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default memo(TrackedNode);

