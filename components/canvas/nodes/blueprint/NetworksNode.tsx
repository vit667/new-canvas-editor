import { memo } from 'react';
import type { NodeProps } from 'reactflow';
import { BP, alpha, type BlueprintNetwork } from '@/lib/blueprint';

export interface NetworksNodeData {
  label: string;
  networks: BlueprintNetwork[];
}

/** Панель «Сети»: справочник VLAN, из которого раскрашиваются связи и устройства */
function NetworksNode({ data, selected }: NodeProps<NetworksNodeData>) {
  const networks = data.networks || [];

  return (
    <div
      className="bp-card w-[300px] rounded-lg border p-3"
      style={{
        background: BP.panel,
        borderColor: selected ? BP.neutral : BP.border,
      }}
    >
      <div className="mb-2 text-[13px] font-semibold" style={{ color: BP.text }}>
        {data.label || 'Сети'}
      </div>
      <div className="space-y-1.5">
        {networks.map((net) => (
          <div
            key={net.id}
            className="rounded-md border border-l-[3px] px-2.5 py-1.5"
            style={{
              borderColor: BP.border,
              borderLeftColor: net.color,
              background: alpha(net.color, 0.05),
            }}
          >
            <div className="flex items-baseline gap-2">
              <span className="bp-mono text-[11px]" style={{ color: net.color }}>
                {net.tag}
              </span>
              <span className="text-[11px] font-semibold" style={{ color: BP.text }}>
                {net.name}
              </span>
              {net.cidr && (
                <span className="bp-mono ml-auto text-[11px]" style={{ color: BP.neutral }}>
                  {net.cidr}
                </span>
              )}
            </div>
            {net.description && (
              <div className="mt-0.5 text-[10px]" style={{ color: BP.muted }}>
                {net.description}
              </div>
            )}
          </div>
        ))}
        {networks.length === 0 && (
          <div className="text-[11px]" style={{ color: BP.muted }}>
            Нет сетей — откройте редактор, чтобы добавить
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(NetworksNode);
