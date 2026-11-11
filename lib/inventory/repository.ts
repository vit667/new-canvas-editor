import { RULES, runRules, type Rule } from './validation';
import type {
  ApplyResult,
  Change,
  ChangeEvent,
  Entity,
  EntityKind,
  InventoryState,
  Relation,
  RelationType,
  ValidationIssue,
} from './types';

/**
 * Репозиторий реестра. Все представления (схемы, CMDB, IPAM, импорт) читают и пишут
 * только через него. Хранилище подключается адаптером (InventoryStorage):
 * сейчас — localStorage, потом — сервер. Интерфейс от этого не меняется.
 */
export interface InventoryRepository {
  get(id: string): Entity | undefined;
  list(kind?: EntityKind): Entity[];
  relation(id: string): Relation | undefined;
  relations(): Relation[];
  relationsOf(id: string, dir?: 'from' | 'to' | 'both', type?: RelationType): Relation[];
  /** Атомарно применить пакет. Ошибки проверок отменяют весь пакет */
  apply(changes: Change[], origin?: string): ApplyResult;
  /** Все текущие проблемы (для экрана «Проблемы») */
  validate(): ValidationIssue[];
  subscribe(listener: (e: ChangeEvent) => void): () => void;
  snapshot(): InventoryState;
  /** Счётчик версий — для useSyncExternalStore */
  revision(): number;
}

export interface InventoryStorage {
  load(): InventoryState | null;
  save(state: InventoryState): void;
}

export const emptyState = (): InventoryState => ({ version: 1, entities: {}, relations: {} });

/** ULID-подобный id: время + случайность, сортируется по времени создания */
export function newEntityId(): string {
  const A = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let t = Date.now();
  let time = '';
  for (let i = 0; i < 10; i++) {
    time = A[t % 32] + time;
    t = Math.floor(t / 32);
  }
  let rnd = '';
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  for (let i = 0; i < 16; i++) rnd += A[bytes[i] % 32];
  return time + rnd;
}

/** Каскад: что удалить вместе с объектом */
function dependents(state: InventoryState, id: string): string[] {
  const out: string[] = [];
  for (const e of Object.values(state.entities)) {
    if (e.kind === 'interface' && e.attrs.deviceId === id) out.push(e.id);
    else if (e.kind === 'module' && e.attrs.deviceId === id) out.push(e.id);
    else if (e.kind === 'cable' && (e.attrs.aInterfaceId === id || e.attrs.bInterfaceId === id)) out.push(e.id);
    else if (e.kind === 'ipAddress' && (e.attrs.interfaceId === id || e.attrs.assignedToId === id)) out.push(e.id);
  }
  return out;
}

function stableEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const withoutDates = (e: Entity) => {
  const { createdAt: _c, updatedAt: _u, ...rest } = e;
  return rest;
};

export function createInventory(storage: InventoryStorage, rules: Rule[] = RULES): InventoryRepository {
  let state: InventoryState = storage.load() ?? emptyState();
  let rev = 0;
  const listeners = new Set<(e: ChangeEvent) => void>();

  // Индексы связей — пересчитываются после каждого применённого пакета
  let relFrom = new Map<string, Relation[]>();
  let relTo = new Map<string, Relation[]>();
  const reindex = () => {
    relFrom = new Map();
    relTo = new Map();
    for (const r of Object.values(state.relations)) {
      relFrom.set(r.fromId, [...(relFrom.get(r.fromId) || []), r]);
      relTo.set(r.toId, [...(relTo.get(r.toId) || []), r]);
    }
  };
  reindex();

  const repo: InventoryRepository = {
    get: (id) => state.entities[id],
    list: (kind) => {
      const all = Object.values(state.entities);
      return kind ? all.filter((e) => e.kind === kind) : all;
    },
    relation: (id) => state.relations[id],
    relations: () => Object.values(state.relations),
    relationsOf: (id, dir = 'both', type) => {
      const list = [
        ...(dir !== 'to' ? relFrom.get(id) || [] : []),
        ...(dir !== 'from' ? relTo.get(id) || [] : []),
      ];
      return type ? list.filter((r) => r.type === type) : list;
    },

    apply(changes, origin = 'unknown') {
      const now = new Date().toISOString();
      const next: InventoryState = { version: 1, entities: { ...state.entities }, relations: { ...state.relations } };
      const changed = new Set<string>();

      const removeEntity = (id: string) => {
        if (!next.entities[id]) return;
        delete next.entities[id];
        changed.add(id);
        for (const [rid, r] of Object.entries(next.relations)) {
          if (r.fromId === id || r.toId === id) {
            delete next.relations[rid];
            changed.add(rid);
          }
        }
        for (const dep of dependents(next, id)) removeEntity(dep);
      };

      for (const ch of changes) {
        if (ch.op === 'upsert') {
          const prev = next.entities[ch.entity.id];
          const candidate = {
            ...ch.entity,
            createdAt: prev?.createdAt ?? ch.entity.createdAt ?? now,
            updatedAt: now,
          } as Entity;
          if (prev && stableEqual(withoutDates(prev), withoutDates(candidate))) continue;
          if (prev && prev.kind !== candidate.kind) {
            // Смена вида — разрешена, но связи проверятся правилами
          }
          next.entities[candidate.id] = candidate;
          changed.add(candidate.id);
        } else if (ch.op === 'delete') {
          removeEntity(ch.id);
        } else if (ch.op === 'link') {
          const prev = next.relations[ch.relation.id];
          if (prev && stableEqual(prev, ch.relation)) continue;
          next.relations[ch.relation.id] = ch.relation;
          changed.add(ch.relation.id);
        } else if (ch.op === 'unlink') {
          if (next.relations[ch.id]) {
            delete next.relations[ch.id];
            changed.add(ch.id);
          }
        }
      }

      if (changed.size === 0) return { ok: true, issues: [], changedIds: [] };

      const issues = runRules(
        { state: next, entities: Object.values(next.entities), relations: Object.values(next.relations), changed },
        rules
      );
      // Затронутые объекты: изменённые + концы изменённых связей (добавленных и удалённых)
      const touched = new Set(changed);
      for (const id of changed) {
        const r = next.relations[id] ?? state.relations[id];
        if (r) {
          touched.add(r.fromId);
          touched.add(r.toId);
        }
      }
      // Блокируем только ошибки, которые касаются затронутого (старые ошибки не мешают работать)
      const concerns = (i: ValidationIssue) => i.entityIds.length === 0 || i.entityIds.some((id) => touched.has(id));
      const blocking = issues.filter((i) => i.level === 'error' && concerns(i));
      if (blocking.length) return { ok: false, issues: blocking, changedIds: [] };

      state = next;
      rev++;
      reindex();
      storage.save(state);
      const event: ChangeEvent = { origin, changedIds: [...changed] };
      listeners.forEach((l) => l(event));
      return { ok: true, issues: issues.filter(concerns), changedIds: [...changed] };
    },

    validate: () =>
      runRules(
        { state, entities: Object.values(state.entities), relations: Object.values(state.relations), changed: new Set() },
        rules
      ),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => state,
    revision: () => rev,
  };

  return repo;
}
