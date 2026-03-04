import { memo } from 'react';
import { NodeResizer, Handle, Position, type NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { getIconComponent } from '@/lib/canvas-icons';
import type { CustomField } from '@/types/canvas';

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

function GroupNode({ data, selected }: NodeProps) {
  const color = (data.color as keyof typeof badgeColorClasses) || 'default';
  const IconComponent = getIconComponent(data.icon);
  const customFields = (data.customFields as CustomField[]) || [];

  return (
    <div className="relative w-full h-full">
      {/* Handles со всех 4 сторон для группы с уникальными id */}
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
        minWidth={200}
        minHeight={150}
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

export default memo(GroupNode);
