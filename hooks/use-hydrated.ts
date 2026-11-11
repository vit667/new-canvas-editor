"use client"

import { useSyncExternalStore } from "react"

const noopSubscribe = () => () => {}

/**
 * false — пока идёт гидратация (на сервере и в первом проходе клиента), true — после.
 * Нужен всему, что читает localStorage (схемы, реестр): иначе разметка сервера и клиента
 * расходится и React пересоздаёт дерево (ошибка «Hydration failed»).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}
