import type { Entity } from './types';

/**
 * Порты: совместимость концов линка (docs/INVENTORY_MODEL.md §6.9).
 * Всё здесь — предупреждения, не ошибки: в реальной сети бывают и SFP-переходники,
 * и линки на пониженной скорости. Ошибка только одна — второй кабель в тот же порт,
 * её ловит правило cable-per-interface и сам холст.
 */

export interface PortInfo {
  name: string;
  /** 'rj45' | 'sfp' | 'sfp+' | 'qsfp' … */
  type?: string;
  speed?: string;
  mode?: 'access' | 'trunk' | 'routed';
  /** VLAN (untagged) для access */
  vlanId?: string;
  enabled?: boolean;
}

const SPEED_MBPS: Record<string, number> = {
  '100M': 100, '1G': 1000, '2.5G': 2500, '5G': 5000, '10G': 10000, '25G': 25000, '40G': 40000, '100G': 100000,
};

export const isOptical = (t?: string) => !!t && t !== 'rj45' && t !== 'virtual' && t !== 'wireless';

/** Порт со схемы (узел «Коммутатор») → PortInfo */
export function portFromNode(p: { name: string; kind?: string; speed?: string; trunk?: boolean; vlanId?: string; disabled?: boolean }): PortInfo {
  return { name: p.name, type: p.kind === 'sfp' ? 'sfp+' : 'rj45', speed: p.speed, mode: p.trunk ? 'trunk' : 'access', vlanId: p.trunk ? undefined : p.vlanId, enabled: !p.disabled };
}

/** Интерфейс реестра → PortInfo */
export function portFromInterface(e: Entity<'interface'>): PortInfo {
  return { name: e.name, type: e.attrs.type, speed: e.attrs.speed, mode: e.attrs.mode, vlanId: e.attrs.untaggedVlanId, enabled: e.attrs.enabled };
}

/**
 * Предупреждения для линка между двумя портами (или порт ↔ узел без портов: b = undefined).
 * vlanName — как подписать VLAN в сообщении.
 */
export function linkWarnings(a: PortInfo | undefined, b: PortInfo | undefined, vlanName: (id?: string) => string = (id) => id ?? ''): string[] {
  const w: string[] = [];
  for (const p of [a, b]) if (p && p.enabled === false) w.push(`Порт ${p.name} выключен (отмечен свободным)`);
  if (!a || !b) return w;
  if (a.type && b.type && isOptical(a.type) !== isOptical(b.type)) {
    w.push(`Разные среды: ${a.name} — ${a.type}, ${b.name} — ${b.type} (нужен трансивер/медиаконвертер)`);
  }
  const sa = a.speed ? SPEED_MBPS[a.speed] : undefined;
  const sb = b.speed ? SPEED_MBPS[b.speed] : undefined;
  if (sa && sb && sa !== sb) w.push(`Разная скорость: ${a.speed} ↔ ${b.speed}, линк поднимется на ${sa < sb ? a.speed : b.speed}`);
  if (a.mode && b.mode && a.mode !== b.mode && a.mode !== 'routed' && b.mode !== 'routed') {
    w.push(`Режимы не совпадают: ${a.name} — ${a.mode}, ${b.name} — ${b.mode}`);
  }
  if (a.mode === 'access' && b.mode === 'access' && a.vlanId && b.vlanId && a.vlanId !== b.vlanId) {
    w.push(`Разные VLAN на access-линке: ${vlanName(a.vlanId)} ↔ ${vlanName(b.vlanId)}`);
  }
  return w;
}
