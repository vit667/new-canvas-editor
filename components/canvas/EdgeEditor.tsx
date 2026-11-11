import { useState, useEffect } from 'react';
import type { Edge, MarkerType } from 'reactflow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  KIND_OPTIONS,
  ROUTING_OPTIONS,
  SPEED_OPTIONS,
  useNetworksStore,
  type LinkEdgeData,
  type LinkKind,
  type LinkRouting,
  type LinkSpeed,
} from '@/lib/blueprint';

const selectClass =
  'w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring';

interface EdgeEditorProps {
  edge: Edge | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (edgeId: string, updates: Partial<Edge>) => void;
}

type MarkerOption = 'none' | MarkerType;
type LineStyle = 'solid' | 'dashed' | 'dotted';

const edgeColors = {
  default: '#b1b1b7',
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  yellow: '#f59e0b',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  orange: '#f97316',
};

export default function EdgeEditor({ edge, isOpen, onClose, onUpdate }: EdgeEditorProps) {
  const [markerStart, setMarkerStart] = useState<MarkerOption>('none');
  const [markerEnd, setMarkerEnd] = useState<MarkerOption>('arrowclosed' as MarkerOption);
  const [lineStyle, setLineStyle] = useState<LineStyle>('solid');
  const [edgeColor, setEdgeColor] = useState<keyof typeof edgeColors>('default');
  // Сетевая связь (blueprint)
  const networks = useNetworksStore((st) => st.networks);
  const [isLink, setIsLink] = useState(false);
  const [routing, setRouting] = useState<LinkRouting>('step');
  const [kind, setKind] = useState<LinkKind>('access');
  const [speed, setSpeed] = useState<LinkSpeed | ''>('');
  const [vlanId, setVlanId] = useState('');
  const [label, setLabel] = useState('');
  const [showSpeedLabel, setShowSpeedLabel] = useState(false);
  const [animated, setAnimated] = useState(false);
  const [labelAt, setLabelAt] = useState<'center' | 'source' | 'target'>('center');
  const [resetBend, setResetBend] = useState(false);

  useEffect(() => {
    if (edge) {
      // Определяем текущий тип стрелки в начале
      if (edge.markerStart) {
        const type = (edge.markerStart as any).type;
        setMarkerStart(type === 'arrow' || type === 'arrowclosed' ? type : 'arrow');
      } else {
        setMarkerStart('none');
      }

      // Определяем текущий тип стрелки в конце
      if (edge.markerEnd) {
        const type = (edge.markerEnd as any).type;
        setMarkerEnd(type === 'arrow' || type === 'arrowclosed' ? type : 'arrowclosed');
      } else {
        setMarkerEnd('none');
      }

      // Определяем стиль линии
      const strokeDasharray = edge.style?.strokeDasharray;
      if (strokeDasharray === '5,5') {
        setLineStyle('dashed');
      } else if (strokeDasharray === '2,2') {
        setLineStyle('dotted');
      } else {
        setLineStyle('solid');
      }

      // Определяем цвет
      const stroke = edge.style?.stroke;
      const colorKey = Object.entries(edgeColors).find(([_, value]) => value === stroke)?.[0] as keyof typeof edgeColors;
      setEdgeColor(colorKey || 'default');

      const d = (edge.data || {}) as LinkEdgeData;
      setIsLink(edge.type === 'link');
      setRouting(d.routing || 'step');
      setKind(d.kind || 'access');
      setSpeed(d.speed || '');
      setVlanId(d.vlanId || '');
      setLabel(d.label || '');
      setShowSpeedLabel(!!d.showSpeedLabel);
      setAnimated(!!d.animated);
      setLabelAt(d.labelAt || 'center');
      setResetBend(false);
    }
  }, [edge]);

  const handleSave = () => {
    if (!edge) return;

    const color = edgeColors[edgeColor];
    
    const updates: Partial<Edge> = {
      type: isLink ? 'link' : 'default',
      markerStart: markerStart === 'none' ? undefined : {
        type: markerStart,
        width: 10,
        height: 10,
        color: color,
      },
      markerEnd: markerEnd === 'none' ? undefined : {
        type: markerEnd,
        width: 10,
        height: 10,
        color: color,
      },
      style: {
        ...edge.style,
        strokeDasharray: lineStyle === 'dashed' ? '5,5' : lineStyle === 'dotted' ? '2,2' : undefined,
        stroke: color,
      },
      data: {
        ...edge.data,
        showStartDot: markerStart === 'none',
        showEndDot: markerEnd === 'none',
        ...(isLink
          ? {
              routing,
              kind,
              speed: speed || undefined,
              vlanId: vlanId || undefined,
              label: label || undefined,
              showSpeedLabel,
              animated,
              labelAt,
              ...(resetBend ? { centerX: undefined, centerY: undefined } : {}),
            }
          : {}),
      },
    };

    onUpdate(edge.id, updates);
    onClose();
  };

  if (!edge) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Настройки связи</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Сетевая связь */}
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={isLink} onChange={(e) => setIsLink(e.target.checked)} />
            Сетевая связь (VLAN, скорость, ортогональные линии)
          </label>

          {isLink && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Тип</Label>
                  <select value={kind} onChange={(e) => setKind(e.target.value as LinkKind)} className={selectClass}>
                    {KIND_OPTIONS.map((k) => (
                      <option key={k.value} value={k.value} title={k.hint}>{k.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Скорость</Label>
                  <select value={speed} onChange={(e) => setSpeed(e.target.value as LinkSpeed | '')} className={selectClass}>
                    <option value="">—</option>
                    {SPEED_OPTIONS.map((sp) => (
                      <option key={sp.value} value={sp.value}>{sp.value}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Сеть (VLAN)</Label>
                  <select value={vlanId} onChange={(e) => setVlanId(e.target.value)} className={selectClass}>
                    <option value="">— цвет вручную —</option>
                    {networks.map((n) => (
                      <option key={n.id} value={n.id}>{n.tag} · {n.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Линия</Label>
                  <select value={routing} onChange={(e) => setRouting(e.target.value as LinkRouting)} className={selectClass}>
                    {ROUTING_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_140px] gap-3">
                <div className="space-y-1.5">
                  <Label>Подпись</Label>
                  <Input value={label} placeholder="LACP · dual 2.5G" onChange={(e) => setLabel(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Где подпись</Label>
                  <select value={labelAt} onChange={(e) => setLabelAt(e.target.value as 'center' | 'source' | 'target')} className={selectClass}>
                    <option value="center">По центру</option>
                    <option value="source">У начала</option>
                    <option value="target">У конца</option>
                  </select>
                </div>
              </div>
              {(edge.data as LinkEdgeData | undefined)?.centerX != null && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={resetBend} onChange={(e) => setResetBend(e.target.checked)} />
                  Вернуть авторазводку (сбросить ручной поворот)
                </label>
              )}
              <p className="text-muted-foreground text-xs">
                Поворот линии можно тянуть мышью за точку на выделенной связи; двойной клик по точке — сброс.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={showSpeedLabel} onChange={(e) => setShowSpeedLabel(e.target.checked)} />
                  Показывать скорость
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={animated} onChange={(e) => setAnimated(e.target.checked)} />
                  Анимация трафика
                </label>
              </div>
            </div>
          )}

          {/* Стрелка в начале */}
          <div className="space-y-2">
            <Label>Стрелка в начале</Label>
            <select 
              value={markerStart} 
              onChange={(e) => setMarkerStart(e.target.value as MarkerOption)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">Нет</option>
              <option value="arrow">Открытая стрелка</option>
              <option value="arrowclosed">Закрытая стрелка</option>
            </select>
          </div>

          {/* Стрелка в конце */}
          <div className="space-y-2">
            <Label>Стрелка в конце</Label>
            <select 
              value={markerEnd} 
              onChange={(e) => setMarkerEnd(e.target.value as MarkerOption)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">Нет</option>
              <option value="arrow">Открытая стрелка</option>
              <option value="arrowclosed">Закрытая стрелка</option>
            </select>
          </div>

          {/* Стиль линии */}
          <div className="space-y-2">
            <Label>Стиль линии</Label>
            <select 
              value={lineStyle} 
              onChange={(e) => setLineStyle(e.target.value as LineStyle)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="solid">Сплошная</option>
              <option value="dashed">Пунктирная</option>
              <option value="dotted">Точечная</option>
            </select>
          </div>

          {/* Цвет линии */}
          <div className="space-y-2">
            <Label>Цвет линии</Label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(edgeColors).map(([key, color]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setEdgeColor(key as keyof typeof edgeColors)}
                  className={`h-10 rounded-md border-2 transition-all ${
                    edgeColor === key ? 'border-gray-900 ring-2 ring-gray-400' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  title={key}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSave}>
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
