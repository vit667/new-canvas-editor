import { memo } from 'react';
import type { NodeProps } from 'reactflow';
import { BP, alpha } from '@/lib/blueprint';
import AppIcon from '../../AppIcon';
import { BlueprintHandles } from './BlueprintHandles';

export interface CloudNodeData {
  /** Своё название: «Internet», «Yandex Cloud», «MPLS провайдера» */
  label: string;
  subtitle?: string;
  /** Иконка в облаке (необязательно) */
  icon?: string;
  accent?: string;
  /** Скорость канала: ↓ и ↑ */
  down?: string;
  up?: string;
}

/** Облако «Интернет» / внешняя сеть / облачный провайдер — со своим названием */
function CloudNode({ data, selected }: NodeProps<CloudNodeData>) {
  const accent = data.accent || BP.neutral;
  const hasIcon = !!data.icon && data.icon !== 'none';

  return (
    <div className="bp-card relative" style={{ width: 240 }}>
      <BlueprintHandles />
      <div className="relative" style={{ height: 120 }}>
        <svg viewBox="0 0 240 120" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <path
            d="M62 104 C30 104 14 86 18 66 C21 50 36 41 52 43 C56 22 76 10 99 13 C116 15 128 24 134 36 C143 26 160 22 175 28 C192 35 199 50 197 62 C214 64 226 76 224 90 C222 100 212 104 200 104 Z"
            fill={alpha(accent, 0.08)}
            stroke={selected ? accent : alpha(accent, 0.55)}
            strokeWidth={selected ? 2 : 1.5}
            style={{ filter: selected ? `drop-shadow(0 0 10px ${alpha(accent, 0.4)})` : undefined }}
          />
        </svg>
        <div className="absolute inset-x-6 top-[38px] flex flex-col items-center text-center leading-tight">
          <div className="flex items-center gap-1.5">
            {hasIcon && <AppIcon value={data.icon} className="size-4" />}
            <span className="text-[15px] font-semibold" style={{ color: BP.text }}>
              {data.label || 'Internet'}
            </span>
          </div>
          {data.subtitle && (
            <div className="mt-0.5 text-[10px]" style={{ color: BP.muted }}>
              {data.subtitle}
            </div>
          )}
        </div>
      </div>
      {(data.down || data.up) && (
        <div className="bp-mono -mt-1 flex justify-center gap-4 text-[10px]" style={{ color: BP.neutral }}>
          {data.down && <span>↓ {data.down}</span>}
          {data.up && <span>↑ {data.up}</span>}
        </div>
      )}
    </div>
  );
}

export default memo(CloudNode);
