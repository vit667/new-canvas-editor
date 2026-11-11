"use client"

import { useEffect, useState } from 'react';
import type { Node } from 'reactflow';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { iconOptions } from '@/lib/canvas-icons';
import { cn } from '@/lib/utils';
import {
  ACCENT_COLORS,
  newId,
  useNetworksStore,
  type BlueprintNetwork,
} from '@/lib/blueprint';
import type { DeviceRow } from './nodes/blueprint/DeviceNode';

export const BLUEPRINT_NODE_TYPES = ['device', 'section', 'networks'];

interface Props {
  node: Node;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
}

const selectClass =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

const TITLES: Record<string, string> = {
  device: 'Устройство',
  section: 'Секция',
  networks: 'Сети (VLAN)',
};

export default function BlueprintNodeEditor({ node, isOpen, onClose, onSave }: Props) {
  const [data, setData] = useState<Record<string, any>>(node.data || {});
  const networks = useNetworksStore((s) => s.networks);

  useEffect(() => {
    if (isOpen) setData(structuredClone(node.data || {}));
  }, [isOpen, node]);

  const set = (key: string, value: unknown) => setData((d) => ({ ...d, [key]: value }));

  const field = (key: string, label: string, placeholder?: string, mono = false) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`bp-${key}`}>{label}</Label>
      <Input
        id={`bp-${key}`}
        value={data[key] ?? ''}
        placeholder={placeholder}
        className={mono ? 'font-mono' : undefined}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );

  const vlanAndAccent = (
    <div className="grid grid-cols-2 gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="bp-vlan">Сеть (VLAN)</Label>
        <select
          id="bp-vlan"
          className={selectClass}
          value={data.vlanId ?? ''}
          onChange={(e) => set('vlanId', e.target.value || undefined)}
        >
          <option value="">— не задана —</option>
          {networks.map((n) => (
            <option key={n.id} value={n.id}>
              {n.tag} · {n.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label>Цвет {data.vlanId ? <span className="text-muted-foreground font-normal">(берётся из сети)</span> : null}</Label>
        <div className={cn('flex flex-wrap gap-1', data.vlanId && 'pointer-events-none opacity-40')}>
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => set('accent', c.value)}
              className={cn(
                'h-6 w-6 rounded-full border-2',
                data.accent === c.value ? 'border-foreground' : 'border-transparent'
              )}
              style={{ background: c.value }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const iconPicker = (
    <div className="grid gap-1.5">
      <Label>Иконка</Label>
      <div className="grid max-h-36 grid-cols-12 gap-0.5 overflow-y-auto rounded-md border p-1">
        {iconOptions.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            title={label}
            onClick={() => set('icon', value)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded border',
              data.icon === value ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted'
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );

  // --- Строки устройства (SSID, порты и т.п.)
  const rows: DeviceRow[] = data.rows || [];
  const setRow = (id: string, patch: Partial<DeviceRow>) =>
    set('rows', rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  // --- Сети
  const nets: BlueprintNetwork[] = data.networks || [];
  const setNet = (id: string, patch: Partial<BlueprintNetwork>) =>
    set('networks', nets.map((n) => (n.id === id ? { ...n, ...patch } : n)));

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{TITLES[node.type || ''] || 'Узел'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {node.type === 'device' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {field('label', 'Имя', 'MADCAT')}
                {field('role', 'Роль', 'workstation')}
              </div>
              {field('model', 'Модель / описание', 'Gaming PC')}
              <div className="grid grid-cols-2 gap-3">
                {field('ip', 'IP-адрес', '10.0.10.30', true)}
                {field('hostname', 'Hostname', 'madcat.internal', true)}
              </div>
              {field('os', 'ОС / прошивка', 'CachyOS + Windows 11')}
              {vlanAndAccent}
              {iconPicker}
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label>Доп. строки</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => set('rows', [...rows, { id: newId('row'), label: '', value: '' }])}
                  >
                    <Plus className="h-3.5 w-3.5" /> Строка
                  </Button>
                </div>
                {rows.map((r) => (
                  <div key={r.id} className="flex gap-2">
                    <Input value={r.label} placeholder="Home" onChange={(e) => setRow(r.id, { label: e.target.value })} />
                    <Input
                      value={r.value}
                      placeholder="VLAN 10 · LAN"
                      className="font-mono"
                      onChange={(e) => setRow(r.id, { value: e.target.value })}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => set('rows', rows.filter((x) => x.id !== r.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {node.type === 'section' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {field('label', 'Название', 'terra')}
                {field('role', 'Роль', 'server')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {field('subtitle', 'Подзаголовок', 'Proxmox Server')}
                {field('tag', 'Метка справа', 'пусто = из VLAN')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {field('ip', 'IP-адрес', '10.0.10.20', true)}
                {field('hostname', 'Hostname', 'terra.internal', true)}
              </div>
              {vlanAndAccent}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="bp-variant">Рамка</Label>
                  <select
                    id="bp-variant"
                    className={selectClass}
                    value={data.variant ?? 'solid'}
                    onChange={(e) => set('variant', e.target.value)}
                  >
                    <option value="solid">Сплошная</option>
                    <option value="dashed">Пунктирная</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="bp-content">Описание</Label>
                <Textarea
                  id="bp-content"
                  rows={2}
                  value={data.content ?? ''}
                  onChange={(e) => set('content', e.target.value)}
                />
              </div>
              {iconPicker}
            </>
          )}

          {node.type === 'networks' && (
            <>
              {field('label', 'Заголовок панели', 'Сети')}
              <p className="text-muted-foreground text-xs">
                Эти сети доступны в карточках, секциях и связях. Цвет сети автоматически красит IP, рамки и линии.
              </p>
              <div className="grid gap-2">
                {nets.map((n) => (
                  <div key={n.id} className="grid grid-cols-[36px_1fr_1fr_1.3fr_36px] items-start gap-2 rounded-md border p-2">
                    <input
                      type="color"
                      value={n.color}
                      title="Цвет"
                      className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                      onChange={(e) => setNet(n.id, { color: e.target.value })}
                    />
                    <Input value={n.tag} placeholder="VLAN 10" className="font-mono" onChange={(e) => setNet(n.id, { tag: e.target.value })} />
                    <Input value={n.name} placeholder="LAN" onChange={(e) => setNet(n.id, { name: e.target.value })} />
                    <Input value={n.cidr ?? ''} placeholder="10.0.10.0/24" className="font-mono" onChange={(e) => setNet(n.id, { cidr: e.target.value })} />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      title="Удалить сеть"
                      onClick={() => set('networks', nets.filter((x) => x.id !== n.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Input
                      value={n.description ?? ''}
                      placeholder="описание"
                      className="col-span-3 col-start-2"
                      onChange={(e) => setNet(n.id, { description: e.target.value })}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    set('networks', [
                      ...nets,
                      {
                        id: newId('net'),
                        tag: `VLAN ${(nets.length + 1) * 10}`,
                        name: 'Новая сеть',
                        cidr: '',
                        description: '',
                        color: ACCENT_COLORS[nets.length % ACCENT_COLORS.length].value,
                      },
                    ])
                  }
                >
                  <Plus className="h-4 w-4" /> Добавить сеть
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => onSave(data)}>Сохранить</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
