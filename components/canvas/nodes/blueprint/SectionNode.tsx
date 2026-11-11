import { memo } from 'react';
import { NodeResizer, type NodeProps } from 'reactflow';
import AppIcon from '../../AppIcon';
import { BP, alpha, useNetwork } from '@/lib/blueprint';
import { IconTile } from '@/components/ui/icon-tile';
import { BlueprintHandles } from './BlueprintHandles';

export interface SectionNodeData {
  label: string;
  role?: string;
  /** Метка справа сверху, например "VLAN 20 · DMZ". Пусто → берётся из VLAN */
  tag?: string;
  vlanId?: string;
  accent?: string;
  icon?: string;
  subtitle?: string;
  ip?: string;
  hostname?: string;
  variant?: 'solid' | 'dashed';
  content?: string;
}

/**
 * Секция-контейнер (как «terra · server» или «Edge stack»).
 * Тянется за заголовок; тело прозрачно для мыши, чтобы под ним двигался холст
 * и работали вложенные узлы.
 */
function SectionNode({ data, selected }: NodeProps<SectionNodeData>) {
  const network = useNetwork(data.vlanId);
  const accent = network?.color || data.accent || BP.muted;
  const hasIcon = !!data.icon && data.icon !== 'none';
  const tag = data.tag || (network ? `${network.tag} · ${network.name}` : '');
  const hasHeaderRow = hasIcon || data.subtitle || data.ip || data.hostname;

  return (
    <div className="relative h-full w-full">
      <BlueprintHandles />
      <NodeResizer
        isVisible={selected}
        minWidth={220}
        minHeight={140}
        color={accent}
        handleClassName="bp-resize"
        lineClassName="bp-resize"
      />

      <div
        className="h-full w-full rounded-xl border"
        style={{
          borderColor: selected ? accent : alpha(accent, 0.5),
          borderStyle: data.variant === 'dashed' ? 'dashed' : 'solid',
          background: alpha(accent, 0.035),
        }}
      >
        {/* Вкладка-заголовок на верхней рамке — за неё таскается секция */}
        <div
          className="bp-section-drag absolute -top-3 left-3 flex cursor-move items-baseline gap-1.5 rounded-md border px-2 py-0.5"
          style={{ background: BP.bg, borderColor: alpha(accent, 0.5) }}
        >
          <span className="text-[13px] font-semibold" style={{ color: BP.text }}>
            {data.label || 'Секция'}
          </span>
          {data.role && (
            <span className="text-[11px]" style={{ color: BP.muted }}>
              · {data.role}
            </span>
          )}
        </div>

        {tag && (
          <div
            className="bp-mono bp-section-drag absolute top-2.5 right-3 cursor-move rounded border px-1.5 py-px text-[10px] uppercase"
            style={{ color: accent, borderColor: alpha(accent, 0.5), background: alpha(accent, 0.12) }}
          >
            {tag}
          </div>
        )}

        {hasHeaderRow && (
          <div className="bp-section-drag flex cursor-move items-center gap-2.5 px-4 pt-5">
            {hasIcon && (
              <IconTile variant="soft" size="default" className="[--icon-tile-radius:9px]" style={{ color: accent }}>
                <AppIcon value={data.icon} className="size-[18px]" />
              </IconTile>
            )}
            <div className="leading-tight">
              {data.subtitle && (
                <div className="text-[12px] font-medium" style={{ color: BP.text }}>
                  {data.subtitle}
                </div>
              )}
              {(data.ip || data.hostname) && (
                <div className="bp-mono text-[11px]">
                  {data.ip && <span style={{ color: accent }}>{data.ip}</span>}
                  {data.ip && data.hostname && <span style={{ color: BP.muted }}> · </span>}
                  {data.hostname && <span style={{ color: BP.muted }}>{data.hostname}</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {data.content && (
          <div className={`px-4 text-[11px] ${hasHeaderRow ? 'pt-1' : 'pt-5'}`} style={{ color: BP.muted }}>
            {data.content}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(SectionNode);
