import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { SwitchPortsEditor } from './SwitchPortsEditor';
import type {
  EquipmentType,
  EquipmentSpecs,
  UPSSpecs,
  AccessControlSpecs,
  ServerSpecs,
  SwitchSpecs,
  DiskInfo,
  NetworkInterface,
} from '@/types/equipment';

interface EquipmentSpecsEditorProps {
  equipmentType: EquipmentType;
  specs: EquipmentSpecs;
  onChange: (specs: EquipmentSpecs) => void;
}

export function EquipmentSpecsEditor({ equipmentType, specs, onChange }: EquipmentSpecsEditorProps) {
  if (equipmentType === 'generic' || !equipmentType) {
    return null;
  }

  const renderUPSSpecs = (upsSpecs: UPSSpecs) => {
    const updateSpecs = (updates: Partial<UPSSpecs>) => {
      onChange({ ...upsSpecs, ...updates });
    };

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Емкость (ВА)</Label>
            <Input
              type="number"
              value={upsSpecs.capacity || ''}
              onChange={(e) => updateSpecs({ capacity: parseInt(e.target.value) || 0 })}
              className="text-sm h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Емкость батареи (Ач)</Label>
            <Input
              type="number"
              value={upsSpecs.batteryCapacity || ''}
              onChange={(e) => updateSpecs({ batteryCapacity: parseInt(e.target.value) })}
              className="text-sm h-9"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Время работы (мин)</Label>
            <Input
              type="number"
              value={upsSpecs.runtime || ''}
              onChange={(e) => updateSpecs({ runtime: parseInt(e.target.value) })}
              className="text-sm h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Выходных розеток</Label>
            <Input
              type="number"
              value={upsSpecs.outputPorts || ''}
              onChange={(e) => updateSpecs({ outputPorts: parseInt(e.target.value) })}
              className="text-sm h-9"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderAccessControlSpecs = (acSpecs: AccessControlSpecs) => {
    const updateSpecs = (updates: Partial<AccessControlSpecs>) => {
      onChange({ ...acSpecs, ...updates });
    };

    return (
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Тип устройства</Label>
          <Select value={acSpecs.deviceType} onValueChange={(value) => updateSpecs({ deviceType: value as any })}>
            <SelectTrigger className="text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="camera">Камера</SelectItem>
              <SelectItem value="reader">Считыватель</SelectItem>
              <SelectItem value="face-id">Face ID</SelectItem>
              <SelectItem value="controller">Контроллер</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Протокол</Label>
          <Input
            value={acSpecs.protocol || ''}
            onChange={(e) => updateSpecs({ protocol: e.target.value })}
            placeholder="Wiegand, RS-485, TCP/IP"
            className="text-sm h-9"
          />
        </div>
        {acSpecs.deviceType === 'controller' && (
          <div>
            <Label className="text-xs">Количество считывателей</Label>
            <Input
              type="number"
              value={acSpecs.readers || ''}
              onChange={(e) => updateSpecs({ readers: parseInt(e.target.value) })}
              className="text-sm h-9"
            />
          </div>
        )}
      </div>
    );
  };

  const renderServerSpecs = (serverSpecs: ServerSpecs) => {
    const updateSpecs = (updates: Partial<ServerSpecs>) => {
      onChange({ ...serverSpecs, ...updates });
    };

    const addDisk = () => {
      const newDisk: DiskInfo = {
        id: `disk-${Date.now()}`,
        type: 'ssd',
        capacity: 1000,
      };
      updateSpecs({ disks: [...serverSpecs.disks, newDisk] });
    };

    const removeDisk = (id: string) => {
      updateSpecs({ disks: serverSpecs.disks.filter(d => d.id !== id) });
    };

    const updateDisk = (id: string, updates: Partial<DiskInfo>) => {
      updateSpecs({
        disks: serverSpecs.disks.map(d => d.id === id ? { ...d, ...updates } : d)
      });
    };

    const addNetworkInterface = () => {
      const newInterface: NetworkInterface = {
        id: `nic-${Date.now()}`,
        type: 'rj45',
        speed: '1G',
        count: 1,
      };
      updateSpecs({ networkInterfaces: [...serverSpecs.networkInterfaces, newInterface] });
    };

    const removeNetworkInterface = (id: string) => {
      updateSpecs({ networkInterfaces: serverSpecs.networkInterfaces.filter(n => n.id !== id) });
    };

    const updateNetworkInterface = (id: string, updates: Partial<NetworkInterface>) => {
      updateSpecs({
        networkInterfaces: serverSpecs.networkInterfaces.map(n => n.id === id ? { ...n, ...updates } : n)
      });
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Форм-фактор</Label>
            <Select value={serverSpecs.formFactor} onValueChange={(value) => updateSpecs({ formFactor: value as any })}>
              <SelectTrigger className="text-sm h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rack">Rack (стоечный)</SelectItem>
                <SelectItem value="tower">Tower (башня)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {serverSpecs.formFactor === 'rack' && (
            <div>
              <Label className="text-xs">Юнитов (U)</Label>
              <Input
                type="number"
                value={serverSpecs.rackUnits || ''}
                onChange={(e) => updateSpecs({ rackUnits: parseInt(e.target.value) })}
                className="text-sm h-9"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Блоков питания</Label>
            <Input
              type="number"
              value={serverSpecs.powerSupplies}
              onChange={(e) => updateSpecs({ powerSupplies: parseInt(e.target.value) || 1 })}
              className="text-sm h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Мощность БП (Вт)</Label>
            <Input
              type="number"
              value={serverSpecs.powerSupplyWattage}
              onChange={(e) => updateSpecs({ powerSupplyWattage: parseInt(e.target.value) || 0 })}
              className="text-sm h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Процессоров</Label>
            <Input
              type="number"
              value={serverSpecs.cpuCount}
              onChange={(e) => updateSpecs({ cpuCount: parseInt(e.target.value) || 1 })}
              className="text-sm h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Ядер на CPU</Label>
            <Input
              type="number"
              value={serverSpecs.coresPerCpu}
              onChange={(e) => updateSpecs({ coresPerCpu: parseInt(e.target.value) || 1 })}
              className="text-sm h-9"
            />
          </div>
          <div>
            <Label className="text-xs">ОЗУ (ГБ)</Label>
            <Input
              type="number"
              value={serverSpecs.ramSize}
              onChange={(e) => updateSpecs({ ramSize: parseInt(e.target.value) || 0 })}
              className="text-sm h-9"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-semibold">Диски</Label>
            <Button type="button" size="sm" onClick={addDisk} className="h-7 text-xs">
              <Plus className="w-3 h-3 mr-1" />
              Добавить
            </Button>
          </div>
          <div className="space-y-2">
            {serverSpecs.disks.map((disk) => (
              <div key={disk.id} className="flex gap-2 items-end p-2 border rounded bg-gray-50">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Тип</Label>
                    <Select value={disk.type} onValueChange={(value) => updateDisk(disk.id, { type: value as any })}>
                      <SelectTrigger className="text-sm h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hdd">HDD</SelectItem>
                        <SelectItem value="ssd">SSD</SelectItem>
                        <SelectItem value="nvme">NVMe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Емкость (ГБ)</Label>
                    <Input
                      type="number"
                      value={disk.capacity}
                      onChange={(e) => updateDisk(disk.id, { capacity: parseInt(e.target.value) || 0 })}
                      className="text-sm h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Интерфейс</Label>
                    <Input
                      value={disk.interface || ''}
                      onChange={(e) => updateDisk(disk.id, { interface: e.target.value })}
                      placeholder="SATA, SAS"
                      className="text-sm h-8"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeDisk(disk.id)}
                  className="h-8 w-8 p-0 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-semibold">Сетевые интерфейсы</Label>
            <Button type="button" size="sm" onClick={addNetworkInterface} className="h-7 text-xs">
              <Plus className="w-3 h-3 mr-1" />
              Добавить
            </Button>
          </div>
          <div className="space-y-2">
            {serverSpecs.networkInterfaces.map((nic) => (
              <div key={nic.id} className="flex gap-2 items-end p-2 border rounded bg-gray-50">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Тип</Label>
                    <Select value={nic.type} onValueChange={(value) => updateNetworkInterface(nic.id, { type: value as any })}>
                      <SelectTrigger className="text-sm h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rj45">RJ-45</SelectItem>
                        <SelectItem value="sfp">SFP</SelectItem>
                        <SelectItem value="sfp+">SFP+</SelectItem>
                        <SelectItem value="qsfp">QSFP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Скорость</Label>
                    <Input
                      value={nic.speed}
                      onChange={(e) => updateNetworkInterface(nic.id, { speed: e.target.value })}
                      placeholder="1G, 10G"
                      className="text-sm h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Количество</Label>
                    <Input
                      type="number"
                      value={nic.count}
                      onChange={(e) => updateNetworkInterface(nic.id, { count: parseInt(e.target.value) || 1 })}
                      className="text-sm h-8"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeNetworkInterface(nic.id)}
                  className="h-8 w-8 p-0 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Остальные рендеры будут добавлены в следующем файле
  const renderSwitchSpecs = (switchSpecs: SwitchSpecs) => {
    const updateSpecs = (updates: Partial<SwitchSpecs>) => {
      onChange({ ...switchSpecs, ...updates });
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Всего портов</Label>
            <Input
              type="number"
              value={switchSpecs.portCount}
              onChange={(e) => updateSpecs({ portCount: parseInt(e.target.value) || 0 })}
              className="text-sm h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Уровень</Label>
            <Select value={switchSpecs.layer.toString()} onValueChange={(value) => updateSpecs({ layer: parseInt(value) as 2 | 3 })}>
              <SelectTrigger className="text-sm h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">L2 (Layer 2)</SelectItem>
                <SelectItem value="3">L3 (Layer 3)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={switchSpecs.poeSupport}
              onChange={(e) => updateSpecs({ poeSupport: e.target.checked })}
              className="h-4 w-4"
            />
            <Label className="text-xs">Поддержка PoE</Label>
          </div>
          {switchSpecs.poeSupport && (
            <div>
              <Label className="text-xs">PoE портов</Label>
              <Input
                type="number"
                value={switchSpecs.poePorts || ''}
                onChange={(e) => updateSpecs({ poePorts: parseInt(e.target.value) })}
                className="text-sm h-9"
              />
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={switchSpecs.vlanSupport}
            onChange={(e) => updateSpecs({ vlanSupport: e.target.checked })}
            className="h-4 w-4"
          />
          <Label className="text-xs">Поддержка VLAN</Label>
        </div>

        {/* Редактор портов */}
        <div className="border-t pt-4">
          <SwitchPortsEditor
            ports={switchSpecs.ports || []}
            portCount={switchSpecs.portCount}
            onChange={(ports) => updateSpecs({ ports })}
          />
        </div>
      </div>
    );
  };

  // Рендер в зависимости от типа
  switch (equipmentType) {
    case 'ups':
      return renderUPSSpecs(specs as UPSSpecs);
    case 'access-control':
      return renderAccessControlSpecs(specs as AccessControlSpecs);
    case 'server':
      return renderServerSpecs(specs as ServerSpecs);
    case 'switch':
      return renderSwitchSpecs(specs as SwitchSpecs);
    // Остальные типы добавим позже
    default:
      return <div className="text-sm text-gray-500">Редактор для этого типа оборудования в разработке</div>;
  }
}
