import { memo } from 'react';
import {
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from 'reactflow';
import { BP, alpha, speedWidth, useNetwork, type LinkEdgeData } from '@/lib/blueprint';

const KIND_COLOR: Record<string, string> = {
  wan: '#f85149',
  kvm: '#8b96a5',
  internet: '#8b96a5',
  trunk: '#e6edf3',
};

/**
 * Сетевая связь: ортогональная/кривая/прямая, толщина по скорости,
 * цвет по VLAN, тип (access / trunk / wan / kvm / через интернет).
 */
function LinkEdge(props: EdgeProps<LinkEdgeData>) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    markerStart,
    selected,
    data = {},
  } = props;

  const network = useNetwork(data.vlanId);
  const kind = data.kind || 'access';
  const routing = data.routing || 'step';

  const params = { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition };
  const [path, labelX, labelY] =
    routing === 'bezier'
      ? getBezierPath(params)
      : routing === 'straight'
        ? getStraightPath(params)
        : getSmoothStepPath({ ...params, borderRadius: 10, offset: 24 });

  const color =
    network?.color ||
    (kind !== 'access' ? KIND_COLOR[kind] : undefined) ||
    (style.stroke as string) ||
    BP.neutral;

  const width =
    kind === 'internet' ? 1.25 : kind === 'kvm' ? 1.5 : data.speed ? speedWidth(data.speed) : Number(style.strokeWidth) || 2.5;

  const dash =
    kind === 'kvm' ? '6 4' : kind === 'internet' ? '2 5' : (style.strokeDasharray as string | undefined);

  const glow = selected ? `drop-shadow(0 0 6px ${alpha(color, 0.8)})` : undefined;
  const label = data.label || (data.showSpeedLabel && data.speed ? data.speed : '');

  return (
    <>
      {/* Своя отрисовка вместо BaseEdge: глобальный CSS форсирует толщину у .react-flow__edge-path */}
      {kind === 'trunk' && (
        <path d={path} fill="none" className="bp-link-path" style={{ stroke: color, strokeWidth: width + 4, filter: glow }} />
      )}
      <path
        id={id}
        d={path}
        fill="none"
        className="bp-link-path"
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={
          kind === 'trunk'
            ? { stroke: BP.bg, strokeWidth: Math.max(width - 0.5, 1.5) }
            : {
                stroke: color,
                strokeWidth: width,
                strokeDasharray: dash,
                strokeLinecap: kind === 'internet' ? 'round' : undefined,
                filter: glow,
              }
        }
      />
      <path d={path} fill="none" strokeOpacity={0} strokeWidth={20} className="react-flow__edge-interaction" />
      {data.animated && (
        <path
          d={path}
          fill="none"
          className="bp-flow"
          style={{ stroke: alpha('#ffffff', 0.7), strokeWidth: Math.max(width / 2, 1) }}
        />
      )}
      {label && (
        <EdgeLabelRenderer>
          <div
            className="bp-mono nodrag nopan pointer-events-auto absolute rounded border px-1.5 py-px text-[10px]"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: BP.bg,
              borderColor: alpha(color, 0.6),
              color,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(LinkEdge);
