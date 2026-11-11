"use client"

import { useMemo, useRef, useState } from 'react';
import { Search, Trash2, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { iconOptions } from '@/lib/canvas-icons';
import {
  BRAND_PREFIX,
  CI_PREFIX,
  IMG_PREFIX,
  fileToIconSrc,
  isBrandIcon,
  isCiIcon,
  isImageIcon,
  searchBrands,
  useBrandIndex,
  useCustomIconsStore,
} from '@/lib/app-icons';
import { newId } from '@/lib/blueprint';
import { cn } from '@/lib/utils';
import AppIcon from './AppIcon';
import { CI_GROUPS, CI_KINDS, CiIcon, type CiGroup } from './ci-icons';

interface IconPickerProps {
  value?: string;
  onChange: (value: string) => void;
  /** Компактный режим — для строк списков (меньше высота) */
  compact?: boolean;
}

const cellClass = (active: boolean) =>
  cn(
    'flex h-9 w-9 items-center justify-center rounded-md border transition-colors',
    active ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted'
  );

/** Пикер иконок: устройства (CI) · общие (lucide) · бренды (simple-icons, 3000+) · свои (загрузка SVG/PNG) */
export default function IconPicker({ value, onChange, compact }: IconPickerProps) {
  const [tab, setTab] = useState(
    isBrandIcon(value) ? 'brands' : isImageIcon(value) ? 'custom' : isCiIcon(value) || !value ? 'devices' : 'common'
  );
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const index = useBrandIndex();
  const { icons: custom, add, remove } = useCustomIconsStore();

  const brands = useMemo(() => (index ? searchBrands(index, query) : []), [index, query]);
  const devices = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? CI_KINDS.filter((k) => k.label.toLowerCase().includes(q) || k.kind.toLowerCase().includes(q)) : CI_KINDS;
    const groups = new Map<CiGroup, typeof CI_KINDS>();
    for (const k of list) groups.set(k.group, [...(groups.get(k.group) || []), k]);
    return [...groups.entries()];
  }, [query]);

  const common = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? iconOptions.filter((o) => o.label.toLowerCase().includes(q) || o.value.includes(q)) : iconOptions;
  }, [query]);

  const onFiles = async (files: FileList | null) => {
    setError(null);
    for (const file of Array.from(files || [])) {
      try {
        const src = await fileToIconSrc(file);
        add({ id: newId('icon'), name: file.name.replace(/\.[^.]+$/, ''), src });
        onChange(IMG_PREFIX + src);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const gridClass = cn('grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-0.5 overflow-y-auto rounded-md border p-1', compact ? 'max-h-32' : 'max-h-48');

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-2">
      <div className="flex items-center gap-2">
        <TabsList>
          <TabsTrigger value="devices">Устройства</TabsTrigger>
          <TabsTrigger value="common">Общие</TabsTrigger>
          <TabsTrigger value="brands">Бренды</TabsTrigger>
          <TabsTrigger value="custom">Свои</TabsTrigger>
        </TabsList>
        {tab !== 'custom' && (
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === 'brands' ? 'proxmox, mikrotik, jellyfin…' : 'Поиск'}
              className="h-8 pl-7"
            />
          </div>
        )}
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md border', !value && 'opacity-40')} title="Текущая">
          <AppIcon value={value} fallback="box" />
        </div>
      </div>

      <TabsContent value="devices" className="mt-0">
        <div className={cn('space-y-2 overflow-y-auto rounded-md border p-2', compact ? 'max-h-40' : 'max-h-64')}>
          {devices.map(([group, kinds]) => (
            <div key={group}>
              <div className="text-muted-foreground mb-1 text-[11px] font-medium">{CI_GROUPS[group]}</div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-1">
                {kinds.map((k) => {
                  const v = CI_PREFIX + k.kind;
                  return (
                    <button
                      key={k.kind}
                      type="button"
                      title={k.label}
                      onClick={() => onChange(v)}
                      className={cn(
                        'flex h-12 items-center justify-center rounded-md border transition-colors',
                        value === v ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted'
                      )}
                    >
                      <CiIcon kind={k.kind} size={40} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {devices.length === 0 && <div className="text-muted-foreground p-1 text-xs">Ничего не найдено</div>}
        </div>
      </TabsContent>

      <TabsContent value="common" className="mt-0">
        <div className={gridClass}>
          {common.map(({ value: v, label, Icon }) => (
            <button key={v} type="button" title={label} onClick={() => onChange(v)} className={cellClass(value === v)}>
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="brands" className="mt-0">
        {!index ? (
          <div className="text-muted-foreground rounded-md border p-3 text-xs">Загрузка иконок…</div>
        ) : index.length === 0 ? (
          <div className="text-muted-foreground rounded-md border p-3 text-xs">
            Иконки брендов не собраны. Выполните <code>npm run icons</code>.
          </div>
        ) : (
          <>
            <div className={gridClass}>
              {brands.map((b) => {
                const v = BRAND_PREFIX + b.s;
                return (
                  <button key={b.s} type="button" title={b.t} onClick={() => onChange(v)} className={cellClass(value === v)}>
                    <AppIcon value={v} />
                  </button>
                );
              })}
              {brands.length === 0 && <div className="text-muted-foreground col-span-full p-2 text-xs">Ничего не найдено</div>}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">
              {query ? `Найдено: ${brands.length}${brands.length === 120 ? '+' : ''}` : 'Популярное · поиск по 3400+ брендам'} · simple-icons (CC0)
            </p>
          </>
        )}
      </TabsContent>

      <TabsContent value="custom" className="mt-0">
        <input
          ref={fileRef}
          type="file"
          accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp"
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
        <div className={gridClass}>
          <button
            type="button"
            title="Загрузить SVG/PNG"
            onClick={() => fileRef.current?.click()}
            className="hover:bg-muted flex h-9 w-9 items-center justify-center rounded-md border border-dashed"
          >
            <Upload className="size-4" />
          </button>
          {custom.map((c) => {
            const v = IMG_PREFIX + c.src;
            return (
              <div key={c.id} className="group relative">
                <button type="button" title={c.name} onClick={() => onChange(v)} className={cellClass(value === v)}>
                  <AppIcon value={v} className="size-5" />
                </button>
                <button
                  type="button"
                  title="Убрать из библиотеки"
                  onClick={() => remove(c.id)}
                  className="bg-background absolute -top-1 -right-1 hidden rounded-full border p-0.5 group-hover:block"
                >
                  <Trash2 className="size-2.5" />
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-muted-foreground mt-1 text-[11px]">
          {error ? <span className="text-destructive">{error}</span> : 'SVG до 200 КБ или PNG/JPG (ужимается до 128px). Иконка сохраняется в узле и попадает в экспорт.'}
        </p>
      </TabsContent>
    </Tabs>
  );
}
