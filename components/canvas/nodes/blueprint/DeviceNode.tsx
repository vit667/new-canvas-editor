import { memo } from 'react';
import type { NodeProps } from 'reactflow';
import { getIconComponent } from '@/lib/canvas-icons';
import { BP, alpha, useNetwork } from '@/lib/blueprint';
import { IconTile } from '@/components/ui/icon-tile';
import { BlueprintHandles } from './BlueprintHandles';

export interface DeviceRow {
  id: string;
  label: string;
  value: string;
}

export interface DeviceNodeData {
  label: string;
  role?: string;
  icon?: string;
  model?: string;
  ip?: string;
  hostname?: string;
  os?: string;
  vlanId?: string;
  accent?: string;
  rows?: DeviceRow[];
}

/** Карточка устройства: «MADCAT · workstation», иконка, модель, IP · hostname, ОС */
function DeviceNode({ data, selected }: NodeProps<DeviceNodeData>) {
  const network = useNetwork(data.vlanId);
  const accent = network?.color || data.accent || '#4f9cf9';
  const Icon = getIconComponent(data.icon) ?? getIconComponent('server');
  const rows = (data.rows || []).filter((r) => r.label || r.value);

  return (
    <div
      className="bp-card relative min-w-[230px] max-w-[340px] rounded-lg border px-3 pt-2 pb-2.5"
      style={{
        background: BP.panel,
        borderColor: selected ? accent : alpha(accent, 0.45),
        boxShadow: selected ? `0 0 0 1px ${accent}, 0 0 24px ${alpha(accent, 0.25)}` : undefined,
      }}
    >
      <BlueprintHandles />

      <div className="mb-2 flex items-baseline gap-1.5 border-b pb-1.5" style={{ borderColor: BP.border }}>
        <span className="text-[13px] font-semibold" style={{ color: BP.text }}>
          {data.label || 'Устройство'}
        </span>
        {data.role && (
          <span className="text-[11px]" style={{ color: BP.muted }}>
            · {data.role}
          </span>
        )}
      </div>

      <div className="flex items-start gap-2.5">
        <IconTile
          variant="soft"
          size="lg"
          className="[--icon-tile-radius:10px]"
          style={{ color: accent }}
        >
          {Icon && <Icon />}
        </IconTile>

        <div className="min-w-0 flex-1 leading-tight">
          {data.model && (
            <div className="truncate text-[12px] font-medium" style={{ color: BP.text }}>
              {data.model}
            </div>
          )}
          {(data.ip || data.hostname) && (
            <div className="bp-mono mt-0.5 truncate text-[11px]">
              {data.ip && <span style={{ color: accent }}>{data.ip}</span>}
              {data.ip && data.hostname && <span style={{ color: BP.muted }}> · </span>}
              {data.hostname && <span style={{ color: BP.muted }}>{data.hostname}</span>}
            </div>
          )}
          {data.os && (
            <div className="mt-0.5 truncate text-[11px]" style={{ color: BP.muted }}>
              {data.os}
            </div>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="mt-2 space-y-0.5 border-t pt-1.5" style={{ borderColor: BP.border }}>
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-[11px]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
              <span className="truncate" style={{ color: BP.neutral }}>{r.label}</span>
              <span className="bp-mono ml-auto truncate" style={{ color: BP.muted }}>{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(DeviceNode);
