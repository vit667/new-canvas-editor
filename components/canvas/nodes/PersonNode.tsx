import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { cn } from '@/lib/utils'
import { Mail, Phone } from 'lucide-react'

const colorBorders: Record<string, string> = {
  default: 'border-blue-200 bg-white',
  red: 'border-red-300 bg-red-50',
  orange: 'border-orange-300 bg-orange-50',
  yellow: 'border-yellow-300 bg-yellow-50',
  green: 'border-green-300 bg-green-50',
  cyan: 'border-cyan-300 bg-cyan-50',
  purple: 'border-purple-300 bg-purple-50',
}

const avatarColors: Record<string, string> = {
  default: 'bg-blue-100 text-blue-700',
  red: 'bg-red-100 text-red-700',
  orange: 'bg-orange-100 text-orange-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  green: 'bg-green-100 text-green-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  purple: 'bg-purple-100 text-purple-700',
}

function PersonNode({ data, selected }: NodeProps) {
  const color = (data.color as string) || 'default'
  const initials = (data.label as string)
    ?.split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 min-w-[220px] max-w-[280px] transition-all',
        colorBorders[color] || colorBorders.default,
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

      <div className="flex items-center gap-3 mb-1">
        <div
          className={cn(
            'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold',
            avatarColors[color] || avatarColors.default
          )}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm leading-tight truncate">{data.label || 'Персона'}</div>
          {data.role && (
            <div className="text-xs text-muted-foreground truncate">{data.role as string}</div>
          )}
        </div>
      </div>

      {(data.email || data.phone) && (
        <div className="mt-2 space-y-1 border-t pt-2">
          {data.email && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Mail className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{data.email as string}</span>
            </div>
          )}
          {data.phone && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Phone className="w-3 h-3 flex-shrink-0" />
              <span>{data.phone as string}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default memo(PersonNode)
