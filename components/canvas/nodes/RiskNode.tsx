import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { cn } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const severityConfig = {
  critical: { label: 'Критичный', variant: 'destructive' as const },
  high: { label: 'Высокий', variant: 'default' as const },
  medium: { label: 'Средний', variant: 'secondary' as const },
  low: { label: 'Низкий', variant: 'outline' as const },
}

function RiskNode({ data, selected }: NodeProps) {
  const severity = (data.severity as keyof typeof severityConfig) || 'medium'
  const severityInfo = severityConfig[severity] || severityConfig.medium
  
  const probability = data.probability || '—'
  const impact = data.impact || '—'
  const score = data.score || (probability !== '—' && impact !== '—' ? (Number(probability) * Number(impact)).toFixed(1) : '—')

  return (
    <div
      className={cn(
        'rounded-lg border-2 min-w-[220px] max-w-[260px] bg-white overflow-hidden transition-all',
        'border-red-200',
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
      <div className="bg-red-50 px-3 py-2 flex items-center gap-2 border-b border-red-100">
        <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
        <span className="text-xs text-red-600 truncate font-medium">Риск</span>
      </div>

      {/* Body */}
      <div className="px-3 py-3 space-y-2">
        <div className="font-semibold text-sm leading-tight">{data.label || 'Риск'}</div>

        {data.description && (
          <div className="text-xs text-muted-foreground line-clamp-2">{data.description as string}</div>
        )}

        {/* Probability & Impact */}
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <div className="bg-blue-50 p-1.5 rounded border border-blue-200">
            <div className="text-blue-600 font-medium">Вероятность</div>
            <div className="text-blue-700 font-bold text-center">{probability}</div>
          </div>
          <div className="bg-orange-50 p-1.5 rounded border border-orange-200">
            <div className="text-orange-600 font-medium">Влияние</div>
            <div className="text-orange-700 font-bold text-center">{impact}</div>
          </div>
        </div>

        {/* Risk Score */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">Оценка:</span>
          <span className="font-mono font-bold text-red-600">{score}</span>
        </div>

        {/* Severity Badge */}
        <div className="pt-1">
          <Badge variant={severityInfo.variant} className="text-xs">
            {severityInfo.label}
          </Badge>
        </div>
      </div>
    </div>
  )
}

export default memo(RiskNode)
