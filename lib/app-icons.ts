"use client"

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Единая система иконок для blueprint-узлов. Значение иконки — строка:
 *   "server"            — lucide-иконка из lib/canvas-icons (как раньше)
 *   "si:proxmox"        — бренд из simple-icons (public/brand-icons, грузится лениво)
 *   "img:data:image/…"  — своя иконка (SVG/PNG), хранится прямо в узле,
 *                         поэтому переживает экспорт/импорт и синхронизацию
 */

export interface BrandIndexEntry {
  s: string; // slug
  t: string; // title
  h: string; // hex без #
  a?: string[]; // aliases
}

export const BRAND_PREFIX = 'si:';
export const IMG_PREFIX = 'img:';

export const isBrandIcon = (v?: string) => !!v && v.startsWith(BRAND_PREFIX);
export const isImageIcon = (v?: string) => !!v && v.startsWith(IMG_PREFIX);

/** Популярное для инфраструктурных схем — показывается в пикере без поиска */
export const POPULAR_BRANDS = [
  'proxmox', 'truenas', 'opnsense', 'pfsense', 'mikrotik', 'ubiquiti', 'cisco', 'avm',
  'docker', 'kubernetes', 'linux', 'debian', 'ubuntu', 'archlinux', 'windows', 'apple',
  'nginx', 'traefikproxy', 'caddy', 'cloudflare', 'wireguard', 'tailscale', 'openvpn', 'adguard',
  'pihole', 'homeassistant', 'zigbee2mqtt', 'nodered', 'grafana', 'prometheus', 'influxdb', 'postgresql',
  'mysql', 'mariadb', 'redis', 'mongodb', 'jellyfin', 'plex', 'sonarr', 'radarr',
  'qbittorrent', 'immich', 'nextcloud', 'forgejo', 'gitea', 'gitlab', 'github', 'matrix',
  'element', 'signal', 'whatsapp', 'telegram', 'discord', 'ollama', 'openai', 'anthropic',
  'backblaze', 'synology', 'raspberrypi', 'intel', 'amd', 'nvidia', 'samsung', 'westerndigital',
];

let indexPromise: Promise<BrandIndexEntry[]> | null = null;
export function loadBrandIndex(): Promise<BrandIndexEntry[]> {
  if (!indexPromise) {
    indexPromise = fetch('/brand-icons/index.json')
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => {
        indexPromise = null;
        return [];
      });
  }
  return indexPromise;
}

export function useBrandIndex(): BrandIndexEntry[] | null {
  const [index, setIndex] = useState<BrandIndexEntry[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadBrandIndex().then((i) => alive && setIndex(i));
    return () => {
      alive = false;
    };
  }, []);
  return index;
}

export function searchBrands(index: BrandIndexEntry[], query: string, limit = 120): BrandIndexEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    const bySlug = new Map(index.map((i) => [i.s, i]));
    return POPULAR_BRANDS.map((s) => bySlug.get(s)).filter(Boolean) as BrandIndexEntry[];
  }
  const scored: { e: BrandIndexEntry; score: number }[] = [];
  for (const e of index) {
    const t = e.t.toLowerCase();
    let score = -1;
    if (e.s === q || t === q) score = 0;
    else if (t.startsWith(q) || e.s.startsWith(q)) score = 1;
    else if (t.includes(q) || e.s.includes(q)) score = 2;
    else if (e.a?.some((a) => a.toLowerCase().includes(q))) score = 3;
    if (score >= 0) scored.push({ e, score });
  }
  scored.sort((a, b) => a.score - b.score || a.e.t.length - b.e.t.length);
  return scored.slice(0, limit).map((x) => x.e);
}

/** Кэш path-данных брендовых SVG */
const pathCache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

function loadBrandPath(slug: string): Promise<string> {
  const cached = pathCache.get(slug);
  if (cached !== undefined) return Promise.resolve(cached);
  let p = pending.get(slug);
  if (!p) {
    p = fetch(`/brand-icons/${slug}.svg`)
      .then((r) => (r.ok ? r.text() : ''))
      .then((svg) => {
        const d = svg.match(/<path[^>]*\sd="([^"]+)"/)?.[1] ?? '';
        pathCache.set(slug, d);
        pending.delete(slug);
        return d;
      })
      .catch(() => {
        pending.delete(slug);
        return '';
      });
    pending.set(slug, p);
  }
  return p;
}

export function useBrandPath(slug?: string): string | undefined {
  const [d, setD] = useState<string | undefined>(slug ? pathCache.get(slug) : undefined);
  useEffect(() => {
    if (!slug) return setD(undefined);
    const cached = pathCache.get(slug);
    if (cached !== undefined) return setD(cached);
    let alive = true;
    loadBrandPath(slug).then((v) => alive && setD(v));
    return () => {
      alive = false;
    };
  }, [slug]);
  return d;
}

/** Цвет бренда; слишком тёмные (чёрный и т.п.) осветляем, чтобы читались на тёмном фоне */
const hexCache = new Map<string, string>();
export function useBrandHex(slug?: string): string | undefined {
  const [hex, setHex] = useState<string | undefined>(slug ? hexCache.get(slug) : undefined);
  useEffect(() => {
    if (!slug) return setHex(undefined);
    if (hexCache.has(slug)) return setHex(hexCache.get(slug));
    let alive = true;
    loadBrandIndex().then((index) => {
      const e = index.find((i) => i.s === slug);
      const value = e ? readableHex(e.h) : undefined;
      if (value) hexCache.set(slug, value);
      if (alive) setHex(value);
    });
    return () => {
      alive = false;
    };
  }, [slug]);
  return hex;
}

function readableHex(hex: string): string {
  const n = parseInt(hex, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum < 0.22 ? '#e6edf3' : `#${hex}`;
}

/** Библиотека своих иконок (локально в браузере) — для повторного использования */
export interface CustomIcon {
  id: string;
  name: string;
  src: string; // data URL
}

interface CustomIconsState {
  icons: CustomIcon[];
  add: (icon: CustomIcon) => void;
  remove: (id: string) => void;
}

export const useCustomIconsStore = create<CustomIconsState>()(
  persist(
    (set) => ({
      icons: [],
      add: (icon) => set((s) => ({ icons: [icon, ...s.icons.filter((i) => i.src !== icon.src)] })),
      remove: (id) => set((s) => ({ icons: s.icons.filter((i) => i.id !== id) })),
    }),
    { name: 'canvas-custom-icons' }
  )
);

/** Файл → data URL. Растровые картинки ужимаются до 128px, SVG берётся как есть */
export async function fileToIconSrc(file: File): Promise<string> {
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    if (file.size > 200_000) throw new Error('SVG больше 200 КБ');
    const text = await file.text();
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Не удалось прочитать изображение'));
      i.src = url;
    });
    const size = 128;
    const scale = Math.min(1, size / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}
