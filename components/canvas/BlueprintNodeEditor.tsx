"use client"

import { useEffect, useState, type ReactNode } from 'react';
import type { Node } from 'reactflow';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  ACCENT_COLORS,
  SPEED_OPTIONS,
  newId,
  useNetworksStore,
  type BlueprintNetwork,
} from '@/lib/blueprint';
import IconPicker from './IconPicker';
import AppIcon from './AppIcon';

export const BLUEPRINT_NODE_TYPES = ['device', 'section', 'networks', 'switch', 'specs', 'service', 'table', 'legend'];

interface Props {
  node: Node;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
}

const selectClass =
  'border-input bg-background h-9 w-full rounded-md border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

const TITLES: Record<string, string> = {
  device: 'Устройство',
  section: 'Секция',
  networks: 'Сети (VLAN)',
  switch: 'Коммутатор / роутер',
  specs: 'Характеристики',
  service: 'Сервис / стек',
  table: 'Таблица',
  legend: 'Легенда',
};

type Row = { id: string } & Record<string, any>;

/** Редактор списка строк: добавить / удалить / поднять / опустить */
function ListEditor({
  title,
  rows,
  onChange,
  make,
  render,
  addLabel = 'Добавить',
}: {
  title: string;
  rows: Row[];
  onChange: (rows: Row[]) => void;
  make: (index: number) => Row;
  render: (row: Row, set: (patch: Record<string, unknown>) => void, index: number) => ReactNode;
  addLabel?: string;
}) {
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <Label>{title}</Label>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...rows, make(rows.length)])}>
          <Plus className="h-3.5 w-3.5" /> {addLabel}
        </Button>
      </div>
      {rows.map((r, i) => (
        <div key={r.id} className="flex items-start gap-1.5 rounded-md border p-1.5">
          <div className="min-w-0 flex-1">{render(r, (patch) => onChange(rows.map((x) => (x.id === r.id ? { ...x, ...patch } : x))), i)}</div>
          <div className="flex shrink-0 flex-col">
            <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(i, -1)} disabled={i === 0}>
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(i, 1)} disabled={i === rows.length - 1}>
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => onChange(rows.filter((x) => x.id !== r.id))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

/** Маленькая кнопка-иконка с попапом пикера — для строк списков */
function IconButton({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" title="Иконка">
          <AppIcon value={value} fallback="box" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px]" align="start">
        <IconPicker
          compact
          value={value}
          onChange={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

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

  const vlanSelect = (value: string | undefined, onChange: (v: string | undefined) => void, id?: string, emptyLabel = '— не задана —') => (
    <select id={id} className={selectClass} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
      <option value="">{emptyLabel}</option>
      {networks.map((n) => (
        <option key={n.id} value={n.id}>
          {n.tag} · {n.name}
        </option>
      ))}
    </select>
  );

  const accentPicker = (disabled = false) => (
    <div className={cn('flex flex-wrap gap-1', disabled && 'pointer-events-none opacity-40')}>
      {ACCENT_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          onClick={() => set('accent', c.value)}
          className={cn('h-6 w-6 rounded-full border-2', data.accent === c.value ? 'border-foreground' : 'border-transparent')}
          style={{ background: c.value }}
        />
      ))}
    </div>
  );

  const vlanAndAccent = (
    <div className="grid grid-cols-2 gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="bp-vlan">Сеть (VLAN)</Label>
        {vlanSelect(data.vlanId, (v) => set('vlanId', v), 'bp-vlan')}
      </div>
      <div className="grid gap-1.5">
        <Label>
          Цвет {data.vlanId ? <span className="text-muted-foreground font-normal">(берётся из сети)</span> : null}
        </Label>
        {accentPicker(!!data.vlanId)}
      </div>
    </div>
  );

  const iconPicker = (
    <div className="grid gap-1.5">
      <Label>Иконка</Label>
      <IconPicker value={data.icon} onChange={(v) => set('icon', v)} />
    </div>
  );

  const identity = (namePh: string, rolePh: string) => (
    <>
      <div className="grid grid-cols-2 gap-3">
        {field('label', 'Имя', namePh)}
        {field('role', 'Роль', rolePh)}
      </div>
      {field('model', 'Модель / описание', 'CRS310-8G+2S+')}
      <div className="grid grid-cols-2 gap-3">
        {field('ip', 'IP-адрес', '10.0.99.2', true)}
        {field('hostname', 'Hostname', 'switch.internal', true)}
      </div>
    </>
  );

  const nets: BlueprintNetwork[] = data.networks || [];
  const setNet = (id: string, patch: Partial<BlueprintNetwork>) =>
    set('networks', nets.map((n) => (n.id === id ? { ...n, ...patch } : n)));

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>{TITLES[node.type || ''] || 'Узел'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {node.type === 'device' && (
            <>
              {identity('MADCAT', 'workstation')}
              {field('os', 'ОС / прошивка', 'CachyOS + Windows 11')}
              {vlanAndAccent}
              {iconPicker}
              <ListEditor
                title="Доп. строки"
                addLabel="Строка"
                rows={data.rows || []}
                onChange={(rows) => set('rows', rows)}
                make={() => ({ id: newId('row'), label: '', value: '' })}
                render={(r, setRow) => (
                  <div className="flex gap-1.5">
                    <Input value={r.label} placeholder="Home" onChange={(e) => setRow({ label: e.target.value })} />
                    <Input value={r.value} placeholder="VLAN 10 · LAN" className="font-mono" onChange={(e) => setRow({ value: e.target.value })} />
                  </div>
                )}
              />
            </>
          )}

          {node.type === 'switch' && (
            <>
              {identity('MikroTik', 'switch')}
              <div className="grid grid-cols-2 gap-3">
                {field('os', 'ОС / прошивка', 'RouterOS 7.20')}
                {field('note', 'Примечание', 'configured as pure L2 switch')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="bp-vlan">Сеть управления</Label>
                  {vlanSelect(data.vlanId, (v) => set('vlanId', v), 'bp-vlan')}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="bp-side">Порты</Label>
                  <select id="bp-side" className={selectClass} value={data.portSide ?? 'bottom'} onChange={(e) => set('portSide', e.target.value)}>
                    <option value="bottom">Снизу</option>
                    <option value="top">Сверху</option>
                  </select>
                </div>
              </div>
              {iconPicker}
              <ListEditor
                title="Порты"
                addLabel="Порт"
                rows={data.ports || []}
                onChange={(ports) => set('ports', ports)}
                make={(i) => ({ id: newId('p'), name: String(i + 1), label: '', kind: 'rj45' })}
                render={(p, setPort) => (
                  <div className="grid gap-1.5">
                    <div className="grid grid-cols-[64px_1fr_96px] gap-1.5">
                      <Input value={p.name} placeholder="1" className="font-mono" title="Номер" onChange={(e) => setPort({ name: e.target.value })} />
                      <Input value={p.label ?? ''} placeholder="Куда подключён: OPNsense" onChange={(e) => setPort({ label: e.target.value })} />
                      <select className={selectClass} value={p.kind ?? 'rj45'} onChange={(e) => setPort({ kind: e.target.value })}>
                        <option value="rj45">RJ45</option>
                        <option value="sfp">SFP/SFP+</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-[1fr_96px] items-center gap-1.5">
                      {vlanSelect(p.vlanId, (v) => setPort({ vlanId: v }), undefined, '— без VLAN —')}
                      <select className={selectClass} value={p.speed ?? ''} onChange={(e) => setPort({ speed: e.target.value || undefined })}>
                        <option value="">скорость</option>
                        {SPEED_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.value}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={!!p.trunk} onChange={(e) => setPort({ trunk: e.target.checked })} /> Trunk (tagged)
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={!!p.disabled} onChange={(e) => setPort({ disabled: e.target.checked })} /> Свободен
                      </label>
                    </div>
                  </div>
                )}
              />
              <p className="text-muted-foreground text-xs">
                Тяните связь прямо от порта — она возьмёт VLAN, trunk и скорость порта.
              </p>
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
                  <select id="bp-variant" className={selectClass} value={data.variant ?? 'solid'} onChange={(e) => set('variant', e.target.value)}>
                    <option value="solid">Сплошная</option>
                    <option value="dashed">Пунктирная</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="bp-content">Описание</Label>
                <Textarea id="bp-content" rows={2} value={data.content ?? ''} onChange={(e) => set('content', e.target.value)} />
              </div>
              {iconPicker}
            </>
          )}

          {node.type === 'specs' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {field('label', 'Заголовок', 'HARDWARE')}
                <div className="grid gap-1.5">
                  <Label htmlFor="bp-cols">Колонок</Label>
                  <select id="bp-cols" className={selectClass} value={data.columns ?? 1} onChange={(e) => set('columns', Number(e.target.value))}>
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Цвет</Label>
                {accentPicker()}
              </div>
              <ListEditor
                title="Плитки"
                addLabel="Плитка"
                rows={data.tiles || []}
                onChange={(tiles) => set('tiles', tiles)}
                make={() => ({ id: newId('t'), icon: 'cpu', category: 'CPU', value: '', detail: '' })}
                render={(t, setTile) => (
                  <div className="flex gap-1.5">
                    <IconButton value={t.icon} onChange={(v) => setTile({ icon: v })} />
                    <div className="grid flex-1 grid-cols-[90px_1fr] gap-1.5">
                      <Input value={t.category} placeholder="CPU" onChange={(e) => setTile({ category: e.target.value })} />
                      <Input value={t.value} placeholder="Ryzen 9 9900X" onChange={(e) => setTile({ value: e.target.value })} />
                      <Input value={t.detail ?? ''} placeholder="12 cores · 24 threads" className="col-span-2" onChange={(e) => setTile({ detail: e.target.value })} />
                    </div>
                  </div>
                )}
              />
            </>
          )}

          {node.type === 'service' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {field('label', 'Название', 'Jellyfin')}
                {field('subtitle', 'Подпись', 'streaming (iGPU) · stats')}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {field('url', 'Адрес', 'jellyfin.example.com', true)}
                {field('badge', 'Бейдж', 'CT 152', true)}
                {field('badgeSub', 'Под бейджем', '.152', true)}
              </div>
              {vlanAndAccent}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!data.lanOnly} onChange={(e) => set('lanOnly', e.target.checked)} /> Только из LAN / VPN
              </label>
              {iconPicker}
              <ListEditor
                title="Вложенные сервисы (стек)"
                addLabel="Сервис"
                rows={data.items || []}
                onChange={(items) => set('items', items)}
                make={() => ({ id: newId('s'), icon: '', name: '', url: '' })}
                render={(it, setItem) => (
                  <div className="flex gap-1.5">
                    <IconButton value={it.icon} onChange={(v) => setItem({ icon: v })} />
                    <Input value={it.name} placeholder="Traefik" onChange={(e) => setItem({ name: e.target.value })} />
                    <Input value={it.url ?? ''} placeholder="traefik.example.com" className="font-mono" onChange={(e) => setItem({ url: e.target.value })} />
                  </div>
                )}
              />
            </>
          )}

          {node.type === 'table' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {field('label', 'Заголовок', 'Open to the internet')}
                {field('subtitle', 'Подзаголовок', 'port forwards on OPNsense')}
              </div>
              <ListEditor
                title="Строки"
                addLabel="Строка"
                rows={data.rows || []}
                onChange={(rows) => set('rows', rows)}
                make={() => ({ id: newId('r'), key: '', title: '', note: '', tags: 'TCP' })}
                render={(r, setRow) => (
                  <div className="grid grid-cols-[110px_1fr_110px] gap-1.5">
                    <Input value={r.key} placeholder="80, 443" className="font-mono" onChange={(e) => setRow({ key: e.target.value })} />
                    <Input value={r.title} placeholder="Traefik" onChange={(e) => setRow({ title: e.target.value })} />
                    <Input value={r.tags ?? ''} placeholder="TCP, UDP" className="font-mono" onChange={(e) => setRow({ tags: e.target.value })} />
                    <Input value={r.note ?? ''} placeholder="описание" className="col-span-3" onChange={(e) => setRow({ note: e.target.value })} />
                  </div>
                )}
              />
            </>
          )}

          {node.type === 'legend' && (
            <>
              {field('label', 'Заголовок', 'Легенда')}
              <p className="text-muted-foreground text-xs">Легенда собирается автоматически из типов и скоростей связей на схеме.</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={data.showKinds !== false} onChange={(e) => set('showKinds', e.target.checked)} /> Типы связей
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={data.showSpeeds !== false} onChange={(e) => set('showSpeeds', e.target.checked)} /> Скорости
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={data.showNetworks === true} onChange={(e) => set('showNetworks', e.target.checked)} /> Сети
                </label>
              </div>
            </>
          )}

          {node.type === 'networks' && (
            <>
              {field('label', 'Заголовок панели', 'Сети')}
              <p className="text-muted-foreground text-xs">
                Эти сети доступны в карточках, портах, секциях и связях. Цвет сети автоматически красит IP, рамки и линии.
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
                    <Button type="button" size="icon" variant="ghost" title="Удалить сеть" onClick={() => set('networks', nets.filter((x) => x.id !== n.id))}>
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
