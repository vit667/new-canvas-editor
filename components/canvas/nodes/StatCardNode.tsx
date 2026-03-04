import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, BarChart2 } from 'lucide-react'

const trendConfig = {
  up: { Icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
  down: { Icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
  neutral: { Icon: Minus, color: 'text-gray-500', bg: 'bg-gray-50' },
}

function StatCardNode({ data, selected }: NodeProps) {
  const trend = (data.trend as keyof typeof trendConfig) || 'neutral'
  const { Icon: TrendIcon, color: trendColor, bg: trendBg } = trendConfig[trend] || trendConfig.neutral

  return (
    <div
      className={cn(
        'rounded-lg border-2 min-w-[200px] max-w-[260px] bg-white transition-all',
        'border-green-200',
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

      <div className="px-4 py-3">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {data.label || 'Метрика'}
          </span>
          <BarChart2 className="w-4 h-4 text-green-500 flex-shrink-0" />
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-2xl font-bold tracking-tight leading-none">
            {data.value || '—'}
          </span>
          {data.unit && (
            <span className="text-sm text-muted-foreground">{data.unit as string}</span>
          )}
        </div>

        {/* Trend */}
        {data.trendValue && (
          <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1', trendBg, trendColor)}>
            <TrendIcon className="w-3 h-3" />
            <span>{data.trendValue as string}</span>
          </div>
        )}

        {/* Description */}
        {data.description && (
          <div className="text-xs text-muted-foreground mt-2">{data.description as string}</div>
        )}
      </div>
    </div>
  )
}

export default memo(StatCardNode)
