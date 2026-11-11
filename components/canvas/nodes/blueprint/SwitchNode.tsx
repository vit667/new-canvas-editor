import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { BP, alpha, useNetworksStore, type BlueprintNetwork, type LinkSpeed } from '@/lib/blueprint';
import { IconTile } from '@/components/ui/icon-tile';
import AppIcon from '../../AppIcon';
import { BlueprintHandles } from './BlueprintHandles';

export interface SwitchPort {
  id: string;
  /** Номер/имя над портом: "1", "SFP+1" */
  name: string;
  /** Подпись под портом: куда подключён */
  label?: string;
  kind?: 'rj45' | 'sfp';
  vlanId?: string;
  trunk?: boolean;
  speed?: LinkSpeed;
  disabled?: boolean;
}

export interface SwitchNodeData {
  label: string;
  role?: string;
  icon?: string;
  model?: string;
  ip?: string;
  hostname?: string;
  os?: string;
  note?: string;
  vlanId?: string;
  accent?: string;
  ports: SwitchPort[];
  /** С какой стороны выходят провода портов */
  portSide?: 'bottom' | 'top';
}

export const portHandleId = (portId: string, type: 'source' | 'target') => `port-${portId}-${type}`;
export const portIdFromHandle = (handle?: string | null) =>
  handle?.startsWith('port-') ? handle.replace(/^port-/, '').replace(/-(source|target)$/, '') : undefined;

function Port({ port, net, side }: { port: SwitchPort; net?: BlueprintNetwork; side: 'bottom' | 'top' }) {
  const color = port.disabled ? BP.border : port.trunk ? BP.text : net?.color || BP.muted;
  const isSfp = port.kind === 'sfp';
  const pos = side === 'top' ? Position.Top : Position.Bottom;

  const name = (
    <div className="bp-mono text-center text-[9px] leading-none" style={{ color: BP.muted }}>
      {port.name}
    </div>
  );
  const label = (
    <div
      className="max-w-[64px] truncate text-center text-[9px] leading-none"
      style={{ color: port.label ? BP.neutral : BP.border }}
      title={port.label}
    >
      {port.label || '—'}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-1">
      {side === 'bottom' ? name : label}
      <div
        className="relative flex items-end justify-center rounded-[4px] border-2"
        title={[port.name, port.label, net && `${net.tag} · ${net.name}`, port.trunk && 'trunk', port.speed].filter(Boolean).join(' · ')}
        style={{
          width: isSfp ? 40 : 28,
          height: 24,
          borderColor: color,
          background: port.disabled ? 'transparent' : alpha(color, 0.12),
          boxShadow: port.trunk ? `inset 0 0 0 2px ${BP.bg}, inset 0 0 0 3px ${alpha(color, 0.6)}` : undefined,
        }}
      >
        {/* «Защёлка» RJ45 / щель SFP */}
        <div
          className="mb-[3px] rounded-[1px]"
          style={{ width: isSfp ? 26 : 12, height: isSfp ? 4 : 6, background: alpha(color, port.disabled ? 0.3 : 0.7) }}
        />
        <Handle type="source" position={pos} id={portHandleId(port.id, 'source')} className="bp-handle bp-port-handle" />
        <Handle type="target" position={pos} id={portHandleId(port.id, 'target')} className="bp-handle bp-port-handle" />
      </div>
      {side === 'bottom' ? label : name}
    </div>
  );
}

/** Коммутатор/роутер с портами: каждый порт — отдельная точка подключения с цветом VLAN */
function SwitchNode({ data, selected }: NodeProps<SwitchNodeData>) {
  const networks = useNetworksStore((s) => s.networks);
  const mgmt = networks.find((n) => n.id === data.vlanId);
  const accent = mgmt?.color || data.accent || BP.neutral;
  const side = data.portSide || 'bottom';
  const ports = data.ports || [];

  const portsRow = ports.length > 0 && (
    <div className="flex flex-wrap items-start gap-1.5">
      {ports.map((p) => (
        <Port key={p.id} port={p} side={side} net={networks.find((n) => n.id === p.vlanId)} />
      ))}
    </div>
  );

  return (
    <div
      className="bp-card relative min-w-[260px] rounded-lg border px-3 py-2.5"
      style={{
        background: BP.panel,
        borderColor: selected ? accent : alpha(accent, 0.4),
        boxShadow: selected ? `0 0 0 1px ${accent}, 0 0 24px ${alpha(accent, 0.2)}` : undefined,
      }}
    >
      <BlueprintHandles />

      {side === 'top' && <div className="mb-2.5">{portsRow}</div>}

      <div className="flex items-start gap-3">
        <IconTile variant="soft" size="lg" className="[--icon-tile-radius:10px]" style={{ color: accent }}>
          <AppIcon value={data.icon} fallback="network" className="size-5" />
        </IconTile>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[13px] font-semibold" style={{ color: BP.text }}>
              {data.label || 'Коммутатор'}
            </span>
            {data.role && (
              <span className="text-[11px]" style={{ color: BP.muted }}>
                · {data.role}
              </span>
            )}
          </div>
          {data.model && (
            <div className="mt-0.5 text-[12px]" style={{ color: BP.neutral }}>
              {data.model}
            </div>
          )}
          {(data.ip || data.hostname) && (
            <div className="bp-mono mt-0.5 text-[11px]">
              {data.ip && <span style={{ color: accent }}>{data.ip}</span>}
              {data.ip && data.hostname && <span style={{ color: BP.muted }}> · </span>}
              {data.hostname && <span style={{ color: BP.muted }}>{data.hostname}</span>}
            </div>
          )}
          {(data.os || data.note) && (
            <div className="mt-0.5 text-[11px]" style={{ color: BP.muted }}>
              {[data.os, data.note].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      </div>

      {side === 'bottom' && <div className="mt-2.5">{portsRow}</div>}
    </div>
  );
}

export default memo(SwitchNode);
