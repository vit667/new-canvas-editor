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
    }
  }, [edge]);

  const handleSave = () => {
    if (!edge) return;

    const color = edgeColors[edgeColor];
    
    const updates: Partial<Edge> = {
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
      },
    };

    onUpdate(edge.id, updates);
    onClose();
  };

  if (!edge) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Настройки связи</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
