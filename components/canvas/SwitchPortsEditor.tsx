import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EthernetPort, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SwitchPort } from '@/types/equipment';

interface SwitchPortsEditorProps {
  ports: SwitchPort[];
  portCount: number;
  onChange: (ports: SwitchPort[]) => void;
}

export function SwitchPortsEditor({ ports, portCount, onChange }: SwitchPortsEditorProps) {
  const [selectedPort, setSelectedPort] = useState<SwitchPort | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Инициализируем порты если их нет
  const initializePorts = () => {
    const newPorts: SwitchPort[] = [];
    for (let i = 1; i <= portCount; i++) {
      const existingPort = ports.find(p => p.number === i);
      if (existingPort) {
        newPorts.push(existingPort);
      } else {
        newPorts.push({
          id: `port-${i}`,
          number: i,
          mode: 'access',
          vlan: 1,
          enabled: true,
          speed: 'auto',
          duplex: 'auto',
        });
      }
    }
    onChange(newPorts);
  };

  // Если портов нет, инициализируем
  if (ports.length === 0 && portCount > 0) {
    initializePorts();
    return null;
  }

  const handleEditPort = (port: SwitchPort) => {
    setSelectedPort(port);
    setIsEditorOpen(true);
  };

  const handleSavePort = (updatedPort: SwitchPort) => {
    onChange(ports.map(p => p.id === updatedPort.id ? updatedPort : p));
    setIsEditorOpen(false);
    setSelectedPort(null);
  };

  const getPortColor = (port: SwitchPort) => {
    if (!port.enabled) return 'bg-gray-300 border-gray-400';
    if (port.connectedTo) return 'bg-green-500 border-green-600';
    if (port.mode === 'trunk') return 'bg-blue-500 border-blue-600';
    return 'bg-yellow-500 border-yellow-600';
  };

  const getPortStatus = (port: SwitchPort) => {
    if (!port.enabled) return 'Выкл';
    if (port.connectedTo) return 'Подкл';
    return 'Готов';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Конфигурация портов ({ports.length})</Label>
        {ports.length === 0 && (
          <Button size="sm" onClick={initializePorts} className="h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" />
            Инициализировать порты
          </Button>
        )}
      </div>

      {/* Сетка портов */}
      <div className="grid grid-cols-8 gap-1 p-3 border rounded-lg bg-gray-50 max-h-96 overflow-y-auto">
        {ports.map((port) => (
          <button
            key={port.id}
            onClick={() => handleEditPort(port)}
            className={`
              relative flex flex-col items-center justify-center p-2 rounded border-2
              ${getPortColor(port)}
              hover:ring-2 hover:ring-blue-400 transition-all
              text-white text-xs font-bold
            `}
            title={`Порт ${port.number}\n${port.description || 'Нет описания'}\nVLAN: ${port.vlan || 'N/A'}`}
          >
            <EthernetPort className="w-4 h-4 mb-1" />
            <span>{port.number}</span>
            <span className="text-[10px] opacity-80">{getPortStatus(port)}</span>
          </button>
        ))}
      </div>

      {/* Легенда */}
      <div className="flex gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 border border-green-600 rounded"></div>
          <span>Подключен</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-500 border border-yellow-600 rounded"></div>
          <span>Access</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 border border-blue-600 rounded"></div>
          <span>Trunk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-300 border border-gray-400 rounded"></div>
          <span>Выключен</span>
        </div>
      </div>

      {/* Редактор порта */}
      {selectedPort && (
        <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Настройка порта {selectedPort.number}</DialogTitle>
            </DialogHeader>
            <PortEditor
              port={selectedPort}
              onSave={handleSavePort}
              onCancel={() => {
                setIsEditorOpen(false);
                setSelectedPort(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface PortEditorProps {
  port: SwitchPort;
  onSave: (port: SwitchPort) => void;
  onCancel: () => void;
}

function PortEditor({ port, onSave, onCancel }: PortEditorProps) {
  const [editedPort, setEditedPort] = useState<SwitchPort>({ ...port });

  const handleChange = (updates: Partial<SwitchPort>) => {
    setEditedPort({ ...editedPort, ...updates });
  };

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Режим порта</Label>
          <Select value={editedPort.mode} onValueChange={(value) => handleChange({ mode: value as 'access' | 'trunk' })}>
            <SelectTrigger className="text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="access">Access</SelectItem>
              <SelectItem value="trunk">Trunk</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Статус</Label>
          <Select value={editedPort.enabled ? 'enabled' : 'disabled'} onValueChange={(value) => handleChange({ enabled: value === 'enabled' })}>
            <SelectTrigger className="text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="enabled">Включен</SelectItem>
              <SelectItem value="disabled">Выключен</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {editedPort.mode === 'access' && (
        <div>
          <Label className="text-xs">VLAN</Label>
          <Input
            type="number"
            value={editedPort.vlan || ''}
            onChange={(e) => handleChange({ vlan: parseInt(e.target.value) || 1 })}
            placeholder="1"
            className="text-sm h-9"
          />
        </div>
      )}

      {editedPort.mode === 'trunk' && (
        <div>
          <Label className="text-xs">Разрешенные VLAN (через запятую)</Label>
          <Input
            value={editedPort.allowedVlans?.join(',') || ''}
            onChange={(e) => {
              const vlans = e.target.value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
              handleChange({ allowedVlans: vlans });
            }}
            placeholder="1,10,20,30"
            className="text-sm h-9"
          />
        </div>
      )}

      <div>
        <Label className="text-xs">Описание</Label>
        <Input
          value={editedPort.description || ''}
          onChange={(e) => handleChange({ description: e.target.value })}
          placeholder="Подключение к..."
          className="text-sm h-9"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Скорость</Label>
          <Select value={editedPort.speed || 'auto'} onValueChange={(value) => handleChange({ speed: value })}>
            <SelectTrigger className="text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="10M">10 Мбит/с</SelectItem>
              <SelectItem value="100M">100 Мбит/с</SelectItem>
              <SelectItem value="1G">1 Гбит/с</SelectItem>
              <SelectItem value="10G">10 Гбит/с</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Дуплекс</Label>
          <Select value={editedPort.duplex || 'auto'} onValueChange={(value) => handleChange({ duplex: value })}>
            <SelectTrigger className="text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="half">Half</SelectItem>
              <SelectItem value="full">Full</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={editedPort.poe || false}
          onChange={(e) => handleChange({ poe: e.target.checked })}
          className="w-4 h-4"
        />
        <Label className="text-xs cursor-pointer">PoE на этом порту</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} size="sm">
          Отмена
        </Button>
        <Button onClick={() => onSave(editedPort)} size="sm">
          Сохранить
        </Button>
      </div>
    </div>
  );
}
