import { memo } from 'react';
import type { NodeProps } from 'reactflow';
import { BP, alpha } from '@/lib/blueprint';
import { BlueprintHandles } from './BlueprintHandles';

export interface TableRow {
  id: string;
  /** Левая моноширинная колонка: "80, 443" */
  key: string;
  title: string;
  note?: string;
  /** Бейджи через запятую: "TCP, UDP" */
  tags?: string;
}

export interface TableNodeData {
  label: string;
  subtitle?: string;
  accent?: string;
  rows: TableRow[];
}

const TAG_COLORS: Record<string, string> = {
  tcp: '#4f9cf9',
  udp: '#a371f7',
  http: '#3fb950',
  https: '#3fb950',
  lan: '#8b96a5',
  vpn: '#39c5cf',
};

function tagColor(tag: string): string {
  const known = TAG_COLORS[tag.toLowerCase()];
  if (known) return known;
  let h = 0;
  for (const c of tag) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 70% 65%)`;
}

/** Панель-таблица: «Open to the internet», список правил, портов и т.п. */
function TableNode({ data, selected }: NodeProps<TableNodeData>) {
  const rows = data.rows || [];
  const accent = data.accent || BP.neutral;

  return (
    <div
      className="bp-card relative w-[320px] rounded-lg border p-3"
      style={{ background: BP.panel, borderColor: selected ? accent : BP.border }}
    >
      <BlueprintHandles />
      <div className="text-[13px] font-semibold" style={{ color: BP.text }}>
        {data.label || 'Таблица'}
      </div>
      {data.subtitle && (
        <div className="text-[10px]" style={{ color: BP.muted }}>
          {data.subtitle}
        </div>
      )}
      <div className="mt-2 space-y-1">
        {rows.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[84px_1fr_auto] items-center gap-2 rounded-md border px-2 py-1.5"
            style={{ borderColor: BP.border, background: BP.panelAlt }}
          >
            <span className="bp-mono truncate text-[11px]" style={{ color: BP.neutral }} title={r.key}>
              {r.key}
            </span>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[11px] font-semibold" style={{ color: BP.text }}>
                {r.title}
              </div>
              {r.note && (
                <div className="truncate text-[9px]" style={{ color: BP.muted }}>
                  {r.note}
                </div>
              )}
            </div>
            <div className="flex gap-1">
              {(r.tags || '')
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
                .map((t) => {
                  const c = tagColor(t);
                  return (
                    <span
                      key={t}
                      className="bp-mono rounded border px-1 text-[8px] uppercase"
                      style={{ color: c, borderColor: alpha(c.startsWith('#') ? c : '#8b96a5', 0.5) }}
                    >
                      {t}
                    </span>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(TableNode);
