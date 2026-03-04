import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { getIconComponent } from '@/lib/canvas-icons';
import type { ServiceItem, CustomField } from '@/types/canvas';
import ServicePopup from '@/components/canvas/ServicePopup';
import { ArrowLeftRight } from 'lucide-react';

const colorClasses = {
  red: 'bg-red-100 border-red-500 text-red-900',
  orange: 'bg-orange-100 border-orange-500 text-orange-900',
  yellow: 'bg-yellow-100 border-yellow-500 text-yellow-900',
  green: 'bg-green-100 border-green-500 text-green-900',
  cyan: 'bg-cyan-100 border-cyan-500 text-cyan-900',
  purple: 'bg-purple-100 border-purple-500 text-purple-900',
  default: 'bg-white border-gray-300 text-gray-900',
};

function TextNode({ data, selected }: NodeProps) {
  const color = (data.color as keyof typeof colorClasses) || 'default';
  const IconComponent = getIconComponent(data.icon);
  const services = (data.services as ServiceItem[]) || [];
  const customFields = (data.customFields as CustomField[]) || [];
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);

  return (
    <>
      <ServicePopup
        service={selectedService}
        isOpen={!!selectedService}
        onClose={() => setSelectedService(null)}
      />
    <div
      className={cn(
        'px-4 py-2 rounded-lg border-2 min-w-[200px] max-w-[300px] transition-all',
        colorClasses[color],
        selected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
    >
      {/* Handles со всех 4 сторон с уникальными id */}
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
        <div className="font-medium text-sm">{data.label}</div>
      </div>

      {/* Description */}
      {data.content && (
        <div className="text-xs mt-1 mb-2 opacity-80">{data.content}</div>
      )}

      {/* Custom Fields */}
      {customFields.length > 0 && (
        <div className="mt-2 space-y-1">
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

      {/* Services */}
      {services.length > 0 && (
        <div className="mt-2 space-y-1 border-t pt-2">
          {services.map((service) => {
            const ServiceIcon = getIconComponent(service.icon);
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
                {service.port && (
                  <>
                    <ArrowLeftRight className="w-3 h-3 flex-shrink-0 text-gray-500" />
                    <span className="font-mono text-[11px] text-gray-700">
                      {service.port}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
    </>
  );
}

export default memo(TextNode);
