"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/app-shell/page-header"
import { useEntities, useInventoryIssues, useRelations } from "@/lib/inventory/hooks"
import { diagramIndex } from "@/lib/inventory/diagram-sync"
import { buildLookups } from "@/lib/inventory/views"
import type { Entity } from "@/lib/inventory/types"
import { sectionBySlug } from "@/lib/navigation"
import { useProjectsStore } from "@/store/projectsStore"

import { columnsFor, type InventoryRow } from "./columns"
import { EntityDetails } from "./entity-details"

const ALL = "__all"

const selectClass =
  "border-input bg-background h-9 rounded-md border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"

/**
 * Раздел реестра: таблица своего вида объектов со своими колонками.
 * Фильтр по схеме, поиск, сортировка, правка в ячейке, карточка объекта.
 * Состояние (схема, выбранный объект) — в адресе: ссылкой можно поделиться.
 */
export function InventoryPage({ slug }: { slug: string }) {
  const section = sectionBySlug(slug)!
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const scheme = params.get("scheme") ?? ALL
  const selectedId = params.get("id")

  const entities = useEntities()
  const relations = useRelations()
  const issues = useInventoryIssues()
  const projects = useProjectsStore((s) => s.projects)
  const [query, setQuery] = useState("")
  const [sorting, setSorting] = useState<SortingState>([])
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  const setParam = (key: string, value: string | null) => {
    const q = new URLSearchParams(params.toString())
    if (value === null || value === ALL) q.delete(key)
    else q.set(key, value)
    const s = q.toString()
    router.replace(`${pathname}${s ? `?${s}` : ""}`, { scroll: false })
  }

  const lk = useMemo(() => buildLookups(entities, relations), [entities, relations])
  const places = useMemo(() => diagramIndex(projects), [projects])
  const schemeNames = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects])
  const issuesOf = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of issues) for (const id of i.entityIds) m.set(id, (m.get(id) || 0) + 1)
    return m
  }, [issues])

  const icon = (e: Entity) => ("icon" in e.attrs && (e.attrs as { icon?: string }).icon) || section.icon

  // Строки раздела
  const allRows = useMemo<InventoryRow[]>(() => {
    const onScheme = (ids: (string | undefined)[]) =>
      scheme === ALL || ids.some((id) => id && (places.get(id) || []).some((p) => p.projectId === scheme))

    if (slug === "cables") {
      const rows: InventoryRow[] = []
      for (const e of entities) {
        if (e.kind !== "cable") continue
        const pl = places.get(e.attrs.aInterfaceId ?? "") ?? []
        rows.push({
          id: e.id,
          entity: e,
          link: { a: e.attrs.aInterfaceId, b: e.attrs.bInterfaceId, kind: `кабель · ${e.attrs.type ?? "?"}`, speed: e.attrs.speed, vlanId: e.attrs.vlanId, label: e.attrs.label },
          places: pl,
          issues: issuesOf.get(e.id) || 0,
          search: `${lk.label(e.attrs.aInterfaceId)} ${lk.label(e.attrs.bInterfaceId)} ${e.attrs.label ?? ""}`,
          sort: {},
        })
      }
      for (const r of relations) {
        if (r.type !== "connected_to") continue
        const props = (r.props || {}) as Record<string, string>
        const pl = [...(places.get(r.fromId) ?? []), ...(places.get(r.toId) ?? [])]
        rows.push({
          id: r.id,
          link: { a: r.fromId, b: r.toId, kind: props.kind ?? "связь", speed: props.speed, vlanId: props.vlanId, label: props.label, relationType: r.type },
          places: pl.filter((p, i) => pl.findIndex((x) => x.projectId === p.projectId) === i),
          issues: 0,
          search: `${lk.label(r.fromId)} ${lk.label(r.toId)} ${props.kind ?? ""} ${props.label ?? ""}`,
          sort: {},
        })
      }
      return rows.filter((row) => onScheme([row.link?.a, row.link?.b]))
    }

    return entities
      .filter((e) => e.kind === section.kind)
      .filter((e) => onScheme([e.id]))
      .map((e) => {
        const attrs = e.attrs as Record<string, unknown>
        return {
          id: e.id,
          entity: e,
          places: places.get(e.id) || [],
          issues: issuesOf.get(e.id) || 0,
          search: [e.name, e.description, ...Object.values(attrs).filter((v) => typeof v === "string" || typeof v === "number"), ...lk.ipsOf(e.id).map((ip) => ip.attrs.address)]
            .concat(e.kind === "interface" ? [lk.label(e.attrs.deviceId), lk.label(lk.peerOf(e.id)?.id)] : [])
            .join(" "),
          sort: {},
        }
      })
  }, [entities, relations, section.kind, slug, scheme, places, issuesOf, lk])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? allRows.filter((r) => r.search.toLowerCase().includes(q)) : allRows
  }, [allRows, query])

  const columns = useMemo(() => columnsFor(slug, { lk, schemeNames, icon }), [slug, lk, schemeNames]) // eslint-disable-line react-hooks/exhaustive-deps

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  // Сводка над таблицей: для портов — занятость, иначе — счётчик
  const summary = useMemo(() => {
    if (slug !== "ports") return `${rows.length} из ${allRows.length}`
    const ports = allRows.map((r) => r.entity).filter(Boolean) as Entity[]
    const busy = ports.filter((p) => lk.peerOf(p.id)).length
    const off = ports.filter((p) => p.kind === "interface" && p.attrs.enabled === false).length
    return `${ports.length} портов · занято ${busy} · свободно ${ports.length - busy - off} · выключено ${off}`
  }, [slug, rows.length, allRows, lk])

  const selected = selectedId ? lk.byId.get(selectedId) : undefined

  // Выбранная строка — в поле зрения
  useEffect(() => {
    if (!selectedId) return
    document.querySelector(`[data-row-id="${CSS.escape(selectedId)}"]`)?.scrollIntoView({ block: "nearest" })
  }, [selectedId, hydrated])

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
        <PageHeader title={section.title} description={section.description} />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Поиск: ${section.label.toLowerCase()}`} className="pl-8" />
          </div>
          <select value={scheme} onChange={(e) => setParam("scheme", e.target.value)} className={selectClass} aria-label="Схема">
            <option value={ALL}>Все схемы</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                Схема: {p.name}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground ml-auto text-xs">{hydrated ? summary : ""}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead className="bg-muted/40 sticky top-0 z-[1] backdrop-blur">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b">
                  {hg.headers.map((h) => {
                    const dir = h.column.getIsSorted()
                    return (
                      <th
                        key={h.id}
                        style={{ width: h.column.columnDef.size }}
                        className="text-muted-foreground px-3 py-2 text-left text-xs font-medium whitespace-nowrap"
                      >
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className="hover:text-foreground inline-flex items-center gap-1"
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {dir === "asc" ? <ArrowUp className="size-3" /> : dir === "desc" ? <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-30" />}
                        </button>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {hydrated &&
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-row-id={row.id}
                    onClick={() => row.original.entity && setParam("id", row.original.entity.id === selectedId ? null : row.original.entity.id)}
                    className={cn(
                      "border-b last:border-0",
                      row.original.entity && "cursor-pointer",
                      selectedId === row.id ? "bg-primary/5" : "hover:bg-muted/40"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="max-w-[320px] px-3 py-1.5 align-middle">
                        <div className="min-w-0 truncate">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                      </td>
                    ))}
                  </tr>
                ))}
              {hydrated && rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="text-muted-foreground px-3 py-10 text-center text-sm">
                    {allRows.length === 0
                      ? scheme === ALL
                        ? "Пока пусто: объекты появляются из схем (устройства, коммутаторы, сервисы, сети)."
                        : "На этой схеме таких объектов нет."
                      : "Ничего не найдено"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground text-xs">Двойной клик по значению — правка. Изменения сразу видны на всех схемах.</p>
      </div>

      {selected && (
        <EntityDetails
          entity={selected}
          lk={lk}
          places={places.get(selected.id) || []}
          schemeNames={schemeNames}
          onClose={() => setParam("id", null)}
        />
      )}
    </div>
  )
}
