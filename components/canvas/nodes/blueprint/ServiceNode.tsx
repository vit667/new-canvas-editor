import { memo } from 'react';
import type { NodeProps } from 'reactflow';
import { BP, alpha, useNetwork } from '@/lib/blueprint';
import AppIcon from '../../AppIcon';
import { BlueprintHandles } from './BlueprintHandles';

export interface ServiceItemRow {
  id: string;
  icon?: string;
  name: string;
  url?: string;
  note?: string;
}

export interface ServiceNodeData {
  label: string;
  subtitle?: string;
  /** Бейдж справа: "CT 149", "VM 106" */
  badge?: string;
  /** Вторая строка бейджа: ".149" или IP */
  badgeSub?: string;
  icon?: string;
  vlanId?: string;
  accent?: string;
  /** Пометка «только LAN» */
  lanOnly?: boolean;
  url?: string;
  items?: ServiceItemRow[];
}

/** Карточка сервиса или стека сервисов (как «Edge stack», «*arr stack») */
function ServiceNode({ data, selected }: NodeProps<ServiceNodeData>) {
  const network = useNetwork(data.vlanId);
  const accent = network?.color || data.accent || '#4f9cf9';
  const items = data.items || [];

  return (
    <div
      className="bp-card relative w-[280px] rounded-lg border px-3 py-2"
      style={{
        background: BP.panel,
        borderColor: selected ? accent : BP.border,
        boxShadow: selected ? `0 0 0 1px ${accent}` : undefined,
      }}
    >
      <BlueprintHandles />

      <div className="flex items-start gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md" style={{ background: alpha(accent, 0.1) }}>
          <AppIcon value={data.icon} fallback="package" className="size-[18px]" />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold" style={{ color: BP.text }}>
              {data.label || 'Сервис'}
            </span>
            {data.lanOnly && (
              <span className="bp-mono rounded border px-1 text-[8px] uppercase" style={{ color: BP.muted, borderColor: BP.border }}>
                LAN
              </span>
            )}
          </div>
          {data.subtitle && (
            <div className="truncate text-[10px]" style={{ color: BP.muted }}>
              {data.subtitle}
            </div>
          )}
          {data.url && (
            <div className="bp-mono truncate text-[10px]" style={{ color: accent }}>
              {data.url}
            </div>
          )}
        </div>
        {(data.badge || data.badgeSub) && (
          <div className="bp-mono shrink-0 text-right text-[9px] leading-tight" style={{ color: BP.muted }}>
            {data.badge && <div>{data.badge}</div>}
            {data.badgeSub && <div style={{ color: alpha(accent, 0.9) }}>{data.badgeSub}</div>}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-2 space-y-1 border-t pt-1.5" style={{ borderColor: BP.border }}>
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 text-[11px]">
              <AppIcon value={it.icon} fallback="box" className="size-3.5" />
              <span className="shrink-0 font-medium" style={{ color: BP.text }}>
                {it.name}
              </span>
              <span className="bp-mono ml-auto truncate text-[10px]" style={{ color: it.url ? alpha(accent, 0.9) : BP.muted }}>
                {it.url || it.note}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(ServiceNode);
