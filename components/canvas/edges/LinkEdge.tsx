import { memo, useCallback, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  EdgeLabelRenderer,
  Position,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  internalsSymbol,
  useReactFlow,
  useStore,
  type EdgeProps,
  type ReactFlowState,
} from 'reactflow';
import { BP, alpha, speedWidth, useNetwork, type LinkEdgeData } from '@/lib/blueprint';
import { useCanvasStore } from '@/store/canvasStore';

const KIND_COLOR: Record<string, string> = {
  wan: '#f85149',
  kvm: '#8b96a5',
  internet: '#8b96a5',
  trunk: '#e6edf3',
};

/** Авторазводка: первая дорожка в 22px от края узла, дальше шаг 12px */
const LANE_START = 22;
const LANE_GAP = 12;
/** Подпись у конца линии — на таком расстоянии от узла */
const END_LABEL_DISTANCE = 34;

type HandlePoint = { x: number; y: number; pos?: Position };

function handlePoint(s: ReactFlowState, nodeId: string, handleId: string | null | undefined, type: 'source' | 'target'): HandlePoint | null {
  const n = s.nodeInternals.get(nodeId);
  if (!n) return null;
  const pa = n.positionAbsolute ?? n.position;
  const bounds = n[internalsSymbol]?.handleBounds?.[type];
  const h = handleId ? bounds?.find((b) => b.id === handleId) : bounds?.[0];
  if (!h) return { x: pa.x + (n.width ?? 0) / 2, y: pa.y + (n.height ?? 0) / 2 };
  return { x: pa.x + h.x + h.width / 2, y: pa.y + h.y + h.height / 2, pos: h.position };
}

const isVertical = (p?: Position) => p === Position.Top || p === Position.Bottom;

/**
 * Номер дорожки этой связи среди «соседей» — связей из того же узла и с той же стороны.
 * Связи, уходящие влево, нумеруются слева направо, вправо — справа налево:
 * так горизонтальные участки не накладываются и не пересекают друг друга.
 */
function useLane(id: string, source: string): number {
  const selector = useCallback(
    (s: ReactFlowState): number => {
      const me = s.edges.find((e) => e.id === id);
      if (!me) return 0;
      const eligible = (e: typeof me) =>
        e.type === 'link' &&
        e.source === source &&
        (e.data?.routing ?? 'step') === 'step' &&
        e.data?.centerX == null &&
        e.data?.centerY == null;
      if (!eligible(me)) return 0;

      const mySrc = handlePoint(s, me.source, me.sourceHandle, 'source');
      const myTgt = handlePoint(s, me.target, me.targetHandle, 'target');
      if (!mySrc || !myTgt) return 0;
      const vertical = isVertical(mySrc.pos) || mySrc.pos === undefined;
      const along = (p: HandlePoint) => (vertical ? p.x : p.y);
      const myDir = Math.sign(along(myTgt) - along(mySrc));
      if (myDir === 0) return 0;

      // Все связи с этой стороны узла получают разные дорожки (иначе встречные
      // горизонтальные участки накладываются). Сначала уходящие влево/вверх — по возрастанию,
      // затем вправо/вниз — по убыванию координаты порта.
      const group: { key: number; id: string }[] = [];
      for (const e of s.edges) {
        if (!eligible(e)) continue;
        const src = handlePoint(s, e.source, e.sourceHandle, 'source');
        const tgt = handlePoint(s, e.target, e.targetHandle, 'target');
        if (!src || !tgt || src.pos !== mySrc.pos) continue;
        const dir = Math.sign(along(tgt) - along(src));
        if (dir === 0) continue;
        const a = along(src);
        group.push({ id: e.id, key: dir < 0 ? a : 1e7 - a });
      }
      group.sort((x, y) => x.key - y.key || x.id.localeCompare(y.id));
      return Math.max(0, group.findIndex((g) => g.id === id));
    },
    [id, source]
  );
  return useStore(selector);
}

/**
 * Сетевая связь: ортогональная/кривая/прямая, толщина по скорости,
 * цвет по VLAN, тип (access / trunk / wan / kvm / через интернет).
 * Ортогональные линии сами разводятся по дорожкам; точку поворота можно тянуть мышью.
 */
function LinkEdge(props: EdgeProps<LinkEdgeData>) {
  const {
    id,
    source,
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
  const lane = useLane(id, source);
  const { screenToFlowPosition } = useReactFlow();

  const params = { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition };

  // Точка поворота: ручная → по дорожке → по умолчанию (середина)
  let centerX = data.centerX;
  let centerY = data.centerY;
  if (routing === 'step' && centerX == null && centerY == null) {
    const shift = LANE_START + lane * LANE_GAP;
    if (isVertical(sourcePosition)) {
      const dy = targetY - sourceY;
      if (Math.abs(dy) > shift + 16) centerY = sourceY + Math.sign(dy) * shift;
    } else {
      const dx = targetX - sourceX;
      if (Math.abs(dx) > shift + 16) centerX = sourceX + Math.sign(dx) * shift;
    }
  }

  const [path, labelX, labelY] =
    routing === 'bezier'
      ? getBezierPath(params)
      : routing === 'straight'
        ? getStraightPath(params)
        : getSmoothStepPath({ ...params, borderRadius: 10, offset: 20, centerX, centerY });

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

  // Подписи: своя (по умолчанию в центре) и скорость (у конца линии — у начала она тонет в пучке)
  const mainLabel = data.label || '';
  const speedLabel = data.showSpeedLabel && data.speed ? data.speed : '';
  const mainAt = data.labelAt || 'center';

  // Точки у концов линии считаем по реальной геометрии пути
  const pathRef = useRef<SVGPathElement>(null);
  const [ends, setEnds] = useState<{ s: { x: number; y: number }; t: { x: number; y: number } } | null>(null);
  useLayoutEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    try {
      const len = el.getTotalLength();
      const d = Math.min(END_LABEL_DISTANCE, len / 3);
      const s = el.getPointAtLength(d);
      const t = el.getPointAtLength(Math.max(0, len - d));
      setEnds({ s: { x: s.x, y: s.y }, t: { x: t.x, y: t.y } });
    } catch {
      setEnds(null);
    }
  }, [path]);

  const at = (where: 'center' | 'source' | 'target') =>
    where === 'source' && ends ? ends.s : where === 'target' && ends ? ends.t : { x: labelX, y: labelY };

  const labels: { key: string; text: string; pos: { x: number; y: number } }[] = [];
  if (mainLabel) labels.push({ key: 'main', text: mainLabel, pos: at(mainAt) });
  if (speedLabel && !(mainLabel && mainAt === 'target')) labels.push({ key: 'speed', text: speedLabel, pos: at('target') });

  // Перетаскивание точки поворота
  const onBendPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const p = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      const cx = Math.round(p.x);
      const cy = Math.round(p.y);
      useCanvasStore.getState().setEdges((eds) =>
        eds.map((edge) => (edge.id === id ? { ...edge, data: { ...edge.data, centerX: cx, centerY: cy } } : edge))
      );
    };
    const up = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  };

  const resetBend = () => {
    useCanvasStore.getState().setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id !== id) return edge;
        const { centerX: _x, centerY: _y, ...rest } = (edge.data || {}) as LinkEdgeData;
        return { ...edge, data: rest };
      })
    );
  };

  const manual = data.centerX != null || data.centerY != null;

  return (
    <>
      {/* Своя отрисовка вместо BaseEdge: глобальный CSS форсирует толщину у .react-flow__edge-path */}
      {kind === 'trunk' && (
        <path d={path} fill="none" className="bp-link-path" style={{ stroke: color, strokeWidth: width + 4, filter: glow }} />
      )}
      <path
        ref={pathRef}
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
      {(labels.length > 0 || (selected && routing === 'step')) && (
        <EdgeLabelRenderer>
          {labels.map((l) => (
            <div
              key={l.key}
              className="bp-mono nodrag nopan pointer-events-auto absolute rounded border px-1.5 py-px text-[10px] whitespace-nowrap"
              style={{
                transform: `translate(-50%, -50%) translate(${l.pos.x}px, ${l.pos.y}px)`,
                background: BP.bg,
                borderColor: alpha(color, 0.6),
                color,
              }}
            >
              {l.text}
            </div>
          ))}
          {selected && routing === 'step' && (
            <div
              className="bp-bend nodrag nopan pointer-events-auto absolute"
              title={manual ? 'Тяните, чтобы сдвинуть поворот · двойной клик — вернуть авторазводку' : 'Тяните, чтобы сдвинуть поворот'}
              onPointerDown={onBendPointerDown}
              onDoubleClick={resetBend}
              style={{
                transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                borderColor: color,
                background: manual ? color : BP.bg,
              }}
            />
          )}
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(LinkEdge);
