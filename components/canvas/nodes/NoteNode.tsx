import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { cn } from '@/lib/utils'

const colorStyles: Record<string, { bg: string; border: string; fold: string }> = {
  default: { bg: 'bg-yellow-50', border: 'border-yellow-200', fold: 'bg-yellow-200' },
  red: { bg: 'bg-red-50', border: 'border-red-200', fold: 'bg-red-200' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', fold: 'bg-orange-200' },
  green: { bg: 'bg-green-50', border: 'border-green-200', fold: 'bg-green-200' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', fold: 'bg-cyan-200' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', fold: 'bg-purple-200' },
}

function NoteNode({ data, selected }: NodeProps) {
  const color = (data.color as string) || 'default'
  const styles = colorStyles[color] || colorStyles.default

  return (
    <div
      className={cn(
        'relative rounded-lg border min-w-[180px] max-w-[280px] transition-all',
        styles.bg,
        styles.border,
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

      {/* Folded corner */}
      <div
        className={cn(
          'absolute top-0 right-0 w-6 h-6 rounded-bl-md',
          styles.fold
        )}
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}
      />

      <div className="px-3 py-3 pr-6">
        {data.label && (
          <div className="font-semibold text-sm mb-1.5 leading-tight">{data.label as string}</div>
        )}
        {data.content && (
          <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
            {data.content as string}
          </div>
        )}
        {!data.label && !data.content && (
          <div className="text-xs text-muted-foreground italic">Пустая заметка</div>
        )}
      </div>
    </div>
  )
}

export default memo(NoteNode)
