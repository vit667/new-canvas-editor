import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { BP, alpha } from '@/lib/blueprint';
import AppIcon from '../../AppIcon';
import { BlueprintHandles } from './BlueprintHandles';

export interface ExternalSystem {
  id: string;
  icon?: string;
  name: string;
  /** Что это и зачем: «DNS · *.example.com · DNS-01 wildcard cert» */
  note?: string;
  accent?: string;
}

export interface ExternalNodeData {
  label?: string;
  items: ExternalSystem[];
}

export const externalHandleId = (itemId: string, side: 'left' | 'right', type: 'source' | 'target') =>
  `ext-${itemId}-${side}-${type}`;

/** Внешние системы и SaaS: Cloudflare, Backblaze, удалённый доступ… У каждой строки свои точки подключения */
function ExternalNode({ data, selected }: NodeProps<ExternalNodeData>) {
  const items = data.items || [];

  return (
    <div className="bp-card relative w-[300px]" style={{ outline: selected ? `1px solid ${BP.neutral}` : undefined, outlineOffset: 4, borderRadius: 10 }}>
      <BlueprintHandles />
      {data.label && (
        <div className="mb-1.5 text-[10px] font-semibold tracking-wider uppercase" style={{ color: BP.muted }}>
          {data.label}
        </div>
      )}
      <div className="space-y-1.5">
        {items.map((it) => {
          const accent = it.accent || BP.neutral;
          return (
            <div
              key={it.id}
              className="relative flex items-center gap-2.5 rounded-lg border px-2.5 py-2"
              style={{ background: BP.panel, borderColor: BP.border }}
            >
              <Handle type="target" position={Position.Left} id={externalHandleId(it.id, 'left', 'target')} className="bp-handle" />
              <Handle type="source" position={Position.Left} id={externalHandleId(it.id, 'left', 'source')} className="bp-handle" />
              <Handle type="target" position={Position.Right} id={externalHandleId(it.id, 'right', 'target')} className="bp-handle" />
              <Handle type="source" position={Position.Right} id={externalHandleId(it.id, 'right', 'source')} className="bp-handle" />
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-md"
                style={{ background: alpha(accent, 0.12), color: accent }}
              >
                <AppIcon value={it.icon} fallback="globe" className="size-[18px]" />
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[12px] font-semibold" style={{ color: BP.text }}>
                  {it.name || 'Система'}
                </div>
                {it.note && (
                  <div className="truncate text-[10px]" style={{ color: BP.muted }} title={it.note}>
                    {it.note}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(ExternalNode);
