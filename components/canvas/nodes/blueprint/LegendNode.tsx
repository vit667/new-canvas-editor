import { memo, useMemo } from 'react';
import { useStore, type NodeProps, type ReactFlowState } from 'reactflow';
import { BP, KIND_OPTIONS, SPEED_OPTIONS, useNetworksStore, type LinkEdgeData } from '@/lib/blueprint';

export interface LegendNodeData {
  label?: string;
  showNetworks?: boolean;
  showKinds?: boolean;
  showSpeeds?: boolean;
}

const KIND_SAMPLE: Record<string, { stroke: string; width: number; dash?: string; trunk?: boolean }> = {
  trunk: { stroke: BP.text, width: 3, trunk: true },
  access: { stroke: '#4f9cf9', width: 2.5 },
  wan: { stroke: '#f85149', width: 2.5 },
  kvm: { stroke: BP.muted, width: 1.5, dash: '6 4' },
  internet: { stroke: BP.muted, width: 1.25, dash: '2 5' },
  wireless: { stroke: '#4f9cf9', width: 2.25, dash: '0.1 6' },
};

const usedSelector = (s: ReactFlowState) => {
  const kinds = new Set<string>();
  const speeds = new Set<string>();
  for (const e of s.edges) {
    if (e.type !== 'link') continue;
    const d = (e.data || {}) as LinkEdgeData;
    kinds.add(d.kind || 'access');
    if (d.speed) speeds.add(d.speed);
  }
  return `${[...kinds].sort().join(',')}|${[...speeds].sort().join(',')}`;
};

function Line({ stroke, width, dash, trunk }: { stroke: string; width: number; dash?: string; trunk?: boolean }) {
  return (
    <svg width="44" height="10" className="shrink-0">
      {trunk ? (
        <>
          <line x1="2" y1="5" x2="42" y2="5" stroke={stroke} strokeWidth={width + 4} />
          <line x1="2" y1="5" x2="42" y2="5" stroke={BP.panel} strokeWidth={Math.max(width - 0.5, 1.5)} />
        </>
      ) : (
        <line x1="2" y1="5" x2="42" y2="5" stroke={stroke} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" />
      )}
    </svg>
  );
}

/** Легенда, собранная из того, что реально используется на схеме */
function LegendNode({ data, selected }: NodeProps<LegendNodeData>) {
  const used = useStore(usedSelector);
  const networks = useNetworksStore((s) => s.networks);
  const [kinds, speeds] = useMemo(() => used.split('|').map((x) => (x ? x.split(',') : [])), [used]);

  const showKinds = data.showKinds !== false;
  const showSpeeds = data.showSpeeds !== false;
  const showNetworks = data.showNetworks === true;
  const speedList = SPEED_OPTIONS.filter((s) => speeds.includes(s.value));

  return (
    <div className="bp-card w-[290px] rounded-lg border p-3" style={{ background: BP.panel, borderColor: selected ? BP.neutral : BP.border }}>
      <div className="mb-2 text-[13px] font-semibold" style={{ color: BP.text }}>
        {data.label || 'Легенда'}
      </div>

      {showKinds &&
        KIND_OPTIONS.filter((k) => kinds.includes(k.value)).map((k) => (
          <div key={k.value} className="flex items-center gap-2.5 py-0.5">
            <Line {...KIND_SAMPLE[k.value]} />
            <span className="text-[10px]" style={{ color: BP.neutral }}>
              {k.label} <span style={{ color: BP.muted }}>· {k.hint}</span>
            </span>
          </div>
        ))}

      {showSpeeds && speedList.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[10px]" style={{ color: BP.muted }}>
            толщина = скорость
          </span>
          {speedList.map((s) => (
            <span key={s.value} className="flex items-center gap-1">
              <svg width="18" height="10">
                <line x1="1" y1="5" x2="17" y2="5" stroke="#4f9cf9" strokeWidth={s.width} />
              </svg>
              <span className="bp-mono text-[10px]" style={{ color: BP.neutral }}>
                {s.value}
              </span>
            </span>
          ))}
        </div>
      )}

      {showNetworks && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {networks.map((n) => (
            <span key={n.id} className="flex items-center gap-1 text-[10px]">
              <span className="h-2 w-2 rounded-sm" style={{ background: n.color }} />
              <span style={{ color: BP.neutral }}>{n.name}</span>
            </span>
          ))}
        </div>
      )}

      {kinds.length === 0 && !showNetworks && (
        <div className="text-[10px]" style={{ color: BP.muted }}>
          Появится, когда на схеме будут сетевые связи
        </div>
      )}
    </div>
  );
}

export default memo(LegendNode);
