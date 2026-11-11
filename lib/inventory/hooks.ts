"use client"

import { useMemo, useSyncExternalStore } from 'react';
import { getInventory } from './local-adapter';
import { useHydrated } from '@/hooks/use-hydrated';
import type { Entity, EntityKind, Relation, ValidationIssue } from './types';

const subscribe = (cb: () => void) => getInventory().subscribe(cb);
const getRevision = () => getInventory().revision();
const getServerRevision = () => 0;

/** Номер версии реестра; компонент перерисуется при любом изменении */
export function useInventoryRevision(): number {
  return useSyncExternalStore(subscribe, getRevision, getServerRevision);
}

export function useEntity(id?: string): Entity | undefined {
  const rev = useInventoryRevision();
  const hydrated = useHydrated();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (hydrated && id ? getInventory().get(id) : undefined), [id, rev, hydrated]);
}

const EMPTY: never[] = [];

export function useEntities(kind?: EntityKind): Entity[] {
  const rev = useInventoryRevision();
  const hydrated = useHydrated();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (hydrated ? getInventory().list(kind) : EMPTY), [kind, rev, hydrated]);
}

export function useRelations(): Relation[] {
  const rev = useInventoryRevision();
  const hydrated = useHydrated();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (hydrated ? getInventory().relations() : EMPTY), [rev, hydrated]);
}

export function useInventoryIssues(): ValidationIssue[] {
  const rev = useInventoryRevision();
  const hydrated = useHydrated();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (hydrated ? getInventory().validate() : EMPTY), [rev, hydrated]);
}
