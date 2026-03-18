import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { cn } from '@/lib/utils'
import { GitBranch, CheckCircle, XCircle, ArrowRight } from 'lucide-react'

const actionConfig = {
  route: { label: 'МАРШРУТ', class: 'bg-blue-100 text-blue-700 border-blue-300', Icon: ArrowRight },
  accept: { label: 'ПРИНЯТЬ', class: 'bg-green-100 text-green-700 border-green-300', Icon: CheckCircle },
  reject: { label: 'ОТКЛОНИТЬ', class: 'bg-red-100 text-red-700 border-red-300', Icon: XCircle },
}

function RoutingRuleNode({ data, selected }: NodeProps) {
  const action = (data.action as keyof typeof actionConfig) || 'route'
  const { label: actionLabel, class: actionClass, Icon: ActionIcon } = actionConfig[action] || actionConfig.route
  
  const condition = data.condition || 'Условие не задано'
  const destination = data.destination || 'Пункт назначения'
  const priority = data.priority || '—'

  return (
    <div
      className={cn(
        'rounded-lg border-2 min-w-[240px] max-w-[300px] bg-white overflow-hidden transition-all',
        'border-purple-200',
        selected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
    >
      <Handle type="target" position={Position.Top} id="top-target" />
      <Handle type="source" position={Position.Top} id="top-source" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
      <Handle type="target" position={Position.Left} id="left-target" />
      <Handle type="source" position={Position.Left} id="left-source" />
      <Handle type="target" position={Position.Right} id="right-target" />
      <Handle type="source" position={Position.Right} id="right-source" />

      {/* Header */}
      <div className="bg-purple-50 px-3 py-2 border-b border-purple-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GitBranch className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <span className="font-semibold text-sm truncate">{data.label || 'Маршрутизация'}</span>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded border font-mono font-bold flex-shrink-0', actionClass)}>
          {actionLabel}
        </span>
      </div>

      {/* Content */}
      <div className="px-3 py-3 space-y-2">
        {/* Priority */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Приоритет:</span>
          <span className="font-mono font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
            {priority}
          </span>
        </div>

        {/* Condition */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-gray-600">Условие:</span>
          <div className="text-xs bg-gray-50 p-2 rounded border border-gray-200 text-gray-700 line-clamp-2">
            {condition}
          </div>
        </div>

        {/* Destination */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-gray-600">Маршрут:</span>
          <div className="text-xs bg-purple-50 p-2 rounded border border-purple-200 text-purple-700 font-medium truncate">
            {destination}
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(RoutingRuleNode)
