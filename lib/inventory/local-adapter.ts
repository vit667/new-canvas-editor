import { createInventory, emptyState, type InventoryRepository, type InventoryStorage } from './repository';
import type { InventoryState } from './types';

/**
 * Локальное хранилище реестра в браузере (localStorage).
 * Запись откладывается на 250 мс, чтобы серия правок давала одну запись.
 * Сервер подключится другим InventoryStorage — UI это не заметит.
 */
const KEY = 'inventory-v1';

export function localStorageStorage(key = KEY): InventoryStorage {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: InventoryState | null = null;
  const flush = () => {
    if (!pending) return;
    try {
      localStorage.setItem(key, JSON.stringify(pending));
    } catch (e) {
      console.error('[inventory] не удалось сохранить реестр', e);
    }
    pending = null;
    timer = null;
  };
  if (typeof window !== 'undefined') window.addEventListener('beforeunload', flush);

  return {
    load() {
      if (typeof window === 'undefined') return null;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as InventoryState;
        return parsed?.version === 1 ? parsed : null;
      } catch {
        return null;
      }
    },
    save(state) {
      pending = state;
      if (!timer) timer = setTimeout(flush, 250);
    },
  };
}

export const memoryStorage = (initial?: InventoryState): InventoryStorage => {
  let state = initial ?? emptyState();
  return { load: () => state, save: (s) => (state = s) };
};

let instance: InventoryRepository | null = null;

/** Общий экземпляр реестра в браузере */
export function getInventory(): InventoryRepository {
  if (!instance) instance = createInventory(typeof window === 'undefined' ? memoryStorage() : localStorageStorage());
  return instance;
}
