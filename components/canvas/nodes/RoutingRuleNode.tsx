import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { cn } from '@/lib/utils'
import { ArrowDown, Shield, ShieldOff, Forward } from 'lucide-react'

const actionConfig = {
  allow: { label: 'РАЗРЕШИТЬ', class: 'bg-green-100 text-green-700 border-green-300', Icon: Shield },
  deny: { label: 'ЗАПРЕТИТЬ', class: 'bg-red-100 text-red-700 border-red-300', Icon: ShieldOff },
  forward: { label: 'ПЕРЕСЛАТЬ', class: 'bg-blue-100 text-blue-700 border-blue-300', Icon: Forward },
}

const protocolColors: Record<string, string> = {
  tcp: 'bg-purple-100 text-purple-700',
  udp: 'bg-cyan-100 text-cyan-700',
  icmp: 'bg-yellow-100 text-yellow-700',
  any: 'bg-gray-100 text-gray-600',
}

function RoutingRuleNode({ data, selected }: NodeProps) {
  const action = (data.action as keyof typeof actionConfig) || 'allow'
  const { label: actionLabel, class: actionClass, Icon: ActionIcon } = actionConfig[action] || actionConfig.allow
  const protocol = (data.protocol as string) || 'tcp'

  const srcAddr = [data.srcIp, data.srcPort].filter(Boolean).join(':') || 'any'
  const dstAddr = [data.dstIp, data.dstPort].filter(Boolean).join(':') || 'any'

  return (
    <div
      className={cn(
        'rounded-lg border-2 min-w-[220px] max-w-[270px] bg-white overflow-hidden transition-all',
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
      <div className="bg-red-50 px-3 py-2 border-b border-red-100 flex items-center justify-between gap-2">
        <span className="font-semibold text-sm truncate">{data.label || 'Правило'}</span>
        <span className={cn('text-xs px-2 py-0.5 rounded border font-mono font-bold flex-shrink-0', actionClass)}>
          {actionLabel}
        </span>
      </div>

      {/* Route */}
      <div className="px-3 py-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 truncate flex-1 text-center">
            {srcAddr}
          </span>
        </div>

        <div className="flex items-center justify-center gap-2">
          <ArrowDown className="w-3.5 h-3.5 text-gray-400" />
          <span className={cn('text-xs px-2 py-0.5 rounded font-medium', protocolColors[protocol] || protocolColors.any)}>
            {protocol.toUpperCase()}
          </span>
          <ArrowDown className="w-3.5 h-3.5 text-gray-400" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 truncate flex-1 text-center">
            {dstAddr}
          </span>
        </div>
      </div>
    </div>
  )
}

export default memo(RoutingRuleNode)
