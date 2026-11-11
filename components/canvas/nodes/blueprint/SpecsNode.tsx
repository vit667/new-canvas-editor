import { memo } from 'react';
import type { NodeProps } from 'reactflow';
import { BP, alpha } from '@/lib/blueprint';
import AppIcon from '../../AppIcon';
import { BlueprintHandles } from './BlueprintHandles';

export interface SpecTile {
  id: string;
  icon?: string;
  /** Категория сверху: CPU, MEMORY, SSD */
  category: string;
  value: string;
  detail?: string;
}

export interface SpecsNodeData {
  label?: string;
  accent?: string;
  columns?: 1 | 2 | 3 | 4;
  tiles: SpecTile[];
}

/** Плитки характеристик: CPU / Memory / Network / диски */
function SpecsNode({ data, selected }: NodeProps<SpecsNodeData>) {
  const accent = data.accent || '#d29922';
  const cols = data.columns || 1;
  const tiles = data.tiles || [];

  return (
    <div className="bp-card relative rounded-lg" style={{ outline: selected ? `1px solid ${accent}` : undefined, outlineOffset: 4 }}>
      <BlueprintHandles />
      {data.label && (
        <div className="mb-1.5 text-[10px] font-semibold tracking-wider uppercase" style={{ color: accent }}>
          {data.label}
        </div>
      )}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(170px, 1fr))` }}>
        {tiles.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2.5 rounded-md border px-2.5 py-1.5"
            style={{ background: BP.panel, borderColor: BP.border }}
          >
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-md border"
              style={{ color: accent, borderColor: alpha(accent, 0.35), background: alpha(accent, 0.08) }}
            >
              <AppIcon value={t.icon} fallback="cpu" className="size-4" brandColor={false} />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="text-[9px] font-semibold tracking-wider uppercase" style={{ color: accent }}>
                {t.category}
              </div>
              <div className="truncate text-[12px] font-semibold" style={{ color: BP.text }}>
                {t.value}
              </div>
              {t.detail && (
                <div className="truncate text-[10px]" style={{ color: BP.muted }}>
                  {t.detail}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(SpecsNode);
