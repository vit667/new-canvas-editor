import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { NodeResizer } from 'reactflow';
import { cn } from '@/lib/utils';
import { getIconComponent } from '@/lib/canvas-icons';
import type { CustomField, ScannedHost } from '@/types/canvas';
import { scanNetwork } from '@/lib/networkScanner';
import { Button } from '@/components/ui/button';
import { RefreshCw, Network, Activity, AlertCircle } from 'lucide-react';

const badgeColorClasses = {
  red: 'bg-red-50 border-red-400',
  orange: 'bg-orange-50 border-orange-400',
  yellow: 'bg-yellow-50 border-yellow-400',
  green: 'bg-green-50 border-green-400',
  cyan: 'bg-cyan-50 border-cyan-400',
  purple: 'bg-purple-50 border-purple-400',
  default: 'bg-gray-50 border-gray-400',
};

const borderColorClasses = {
  red: 'border-red-400',
  orange: 'border-orange-400',
  yellow: 'border-yellow-400',
  green: 'border-green-400',
  cyan: 'border-cyan-400',
  purple: 'border-purple-400',
  default: 'border-gray-400',
};

function TrackedGroupNode({ data, selected, id }: NodeProps) {
  const color = (data.color as keyof typeof badgeColorClasses) || 'default';
  const IconComponent = getIconComponent(data.icon);
  const customFields = (data.customFields as CustomField[]) || [];
  const networkRange = data.networkRange || '';
  const scannedHosts = (data.scannedHosts as ScannedHost[]) || [];
  const autoCreateNodes = data.autoCreateNodes !== false; // По умолчанию true
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastNetworkScan, setLastNetworkScan] = useState<number | undefined>(data.lastNetworkScan);

  const handleScan = async () => {
    if (!networkRange) return;
    
    setIsScanning(true);
    setScanError(null);
    try {
      const hosts = await scanNetwork(networkRange);
      
      // Обновляем данные группы
      const event = new CustomEvent('updateNodeData', {
        detail: {
          nodeId: id,
          data: {
            scannedHosts: hosts,
            lastNetworkScan: Date.now(),
          },
        },
      });
      window.dispatchEvent(event);
      setLastNetworkScan(Date.now());

      // Если включено автосоздание узлов, создаем узлы для найденных хостов
      if (autoCreateNodes && hosts.length > 0) {
        const createNodesEvent = new CustomEvent('createNodesFromHosts', {
          detail: {
            groupId: id,
            hosts: hosts,
          },
        });
        window.dispatchEvent(createNodesEvent);
      }
    } catch (error: any) {
      console.error('Network scan failed:', error);
      setScanError(error?.message || 'Ошибка сканирования сети');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Handles со всех 4 сторон */}
      <Handle type="target" position={Position.Top} id="top-target" />
      <Handle type="source" position={Position.Top} id="top-source" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="source" position={Position.Left} id="left-source" />
      <Handle type="target" position={Position.Right} id="right-target" />
      <Handle type="source" position={Position.Right} id="right-source" />

      <NodeResizer
        isVisible={selected}
        minWidth={300}
        minHeight={200}
      />

      {/* Бейдж вне группы - только он перетаскивает группу */}
      <div
        className={cn(
          'absolute -top-11 left-0 px-3 py-1 rounded-md border-2 flex items-center gap-2 shadow-sm cursor-move',
          badgeColorClasses[color],
          'bg-opacity-90'
        )}
      >
        {IconComponent && <IconComponent className="w-4 h-4 flex-shrink-0" />}
        <div className="font-semibold text-sm whitespace-nowrap">{data.label}</div>
        <Network className="w-3.5 h-3.5 text-blue-600" />
      </div>

      {/* Сама группа - не перетаскивается, но холст двигается */}
      <div
        data-nodrag
        className={cn(
          'rounded-lg border-2 border-dashed w-full h-full transition-all p-4',
          borderColorClasses[color],
          selected && 'ring-2 ring-blue-500 ring-offset-2'
        )}
      >
        {/* Network Range */}
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1">Диапазон сети:</div>
          <div className="text-xs font-mono text-gray-800">{networkRange || 'Не указан'}</div>
        </div>

        {/* Scan Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-600 flex-1">
            {scanError ? (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-3 h-3" />
                <span className="truncate" title={scanError}>{scanError}</span>
              </div>
            ) : scannedHosts.length > 0 ? (
              <>
                Найдено хостов: <span className="font-semibold">{scannedHosts.length}</span>
                {lastNetworkScan && (
                  <span className="ml-2 text-gray-500">
                    ({new Date(lastNetworkScan).toLocaleTimeString()})
                  </span>
                )}
              </>
            ) : (
              <span>Сеть не сканирована</span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleScan}
            disabled={isScanning || !networkRange}
            className="h-6 px-2 text-xs"
            title={!networkRange ? 'Укажите диапазон сети' : 'Сканировать сеть'}
          >
            <RefreshCw className={cn('w-3 h-3', isScanning && 'animate-spin')} />
          </Button>
        </div>

        {/* Scanned Hosts */}
        {scannedHosts.length > 0 && (
          <div className="mt-2 space-y-1 border-t pt-2 max-h-32 overflow-y-auto">
            <div className="text-xs font-semibold mb-1">Найденные хосты:</div>
            {scannedHosts.slice(0, 10).map((host) => (
              <div
                key={host.ip}
                className="text-xs p-1.5 rounded bg-white bg-opacity-50 flex items-center gap-2"
              >
                <Activity className="w-3 h-3 text-green-600" />
                <span className="font-mono font-semibold">{host.ip}</span>
                {host.hostname && (
                  <span className="text-gray-600 text-[10px]">({host.hostname})</span>
                )}
              </div>
            ))}
            {scannedHosts.length > 10 && (
              <div className="text-xs text-gray-500 italic">
                ... и еще {scannedHosts.length - 10} хостов
              </div>
            )}
          </div>
        )}

        {data.content && (
          <div className="text-xs opacity-70 mt-2">{data.content}</div>
        )}
        
        {/* Custom Fields */}
        {customFields.length > 0 && (
          <div className="mt-3 space-y-1">
            {customFields.map((field) => {
              if (!field.key) return null;
              const FieldIcon = getIconComponent(field.icon);
              return (
                <div
                  key={field.id}
                  className="text-xs flex gap-1.5 items-start opacity-70"
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
    </div>
  );
}

export default memo(TrackedGroupNode);

