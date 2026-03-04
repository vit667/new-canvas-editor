import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { cn } from '@/lib/utils'
import { ShoppingBag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const statusConfig = {
  available: { label: 'В наличии', class: 'bg-green-100 text-green-700 border-green-200' },
  out_of_stock: { label: 'Нет в наличии', class: 'bg-red-100 text-red-700 border-red-200' },
  discontinued: { label: 'Снят', class: 'bg-gray-100 text-gray-600 border-gray-200' },
}

function ProductCardNode({ data, selected }: NodeProps) {
  const status = (data.status as keyof typeof statusConfig) || 'available'
  const statusInfo = statusConfig[status] || statusConfig.available

  return (
    <div
      className={cn(
        'rounded-lg border-2 min-w-[220px] max-w-[260px] overflow-hidden bg-white transition-all',
        'border-orange-200',
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
      <div className="bg-orange-50 px-3 py-2 flex items-center gap-2 border-b border-orange-100">
        <ShoppingBag className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
        {data.category && (
          <span className="text-xs text-orange-600 truncate">{data.category as string}</span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-3 space-y-2">
        <div className="font-semibold text-sm leading-tight">{data.label || 'Товар'}</div>

        {data.description && (
          <div className="text-xs text-muted-foreground line-clamp-2">{data.description as string}</div>
        )}

        <div className="flex items-center justify-between pt-1">
          {data.price ? (
            <span className="text-base font-bold text-orange-600">
              {data.price as string}
              {data.currency && <span className="text-sm ml-0.5">{data.currency as string}</span>}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Цена не указана</span>
          )}
          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', statusInfo.class)}>
            {statusInfo.label}
          </span>
        </div>
      </div>
    </div>
  )
}

export default memo(ProductCardNode)
