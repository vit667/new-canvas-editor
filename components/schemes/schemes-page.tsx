"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Boxes, Copy, MoreHorizontal, Pencil, Plus, Search, Trash2, Workflow } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/app-shell/page-header"
import { useSchemeActions } from "@/components/schemes/scheme-actions"
import { useProjectsStore, type CanvasProject } from "@/store/projectsStore"
import { useEntities } from "@/lib/inventory/hooks"
import { diagramIndex } from "@/lib/inventory/diagram-sync"
import { inventoryHref, schemeHref } from "@/lib/navigation"
import { cn } from "@/lib/utils"

const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

/** Миниатюра схемы: узлы как прямоугольники в масштабе (без рендера React Flow) */
function SchemeThumb({ project }: { project: CanvasProject }) {
  const boxes = useMemo(() => {
    const abs = new Map<string, { x: number; y: number }>()
    const byId = new Map(project.nodes.map((n) => [n.id, n]))
    const pos = (id: string): { x: number; y: number } => {
      const hit = abs.get(id)
      if (hit) return hit
      const n = byId.get(id)
      if (!n) return { x: 0, y: 0 }
      const p = n.parentId ? pos(n.parentId) : { x: 0, y: 0 }
      const r = { x: p.x + n.position.x, y: p.y + n.position.y }
      abs.set(id, r)
      return r
    }
    return project.nodes.map((n) => {
      const p = pos(n.id)
      const w = n.width ?? (typeof n.style?.width === "number" ? n.style.width : 220)
      const h = n.height ?? (typeof n.style?.height === "number" ? n.style.height : 90)
      return { id: n.id, x: p.x, y: p.y, w, h, container: ["section", "group", "tracked-group"].includes(n.type || "") }
    })
  }, [project.nodes])

  if (!boxes.length) {
    return <div className="text-muted-foreground flex h-full items-center justify-center text-xs">Пустая схема</div>
  }
  const minX = Math.min(...boxes.map((b) => b.x))
  const minY = Math.min(...boxes.map((b) => b.y))
  const maxX = Math.max(...boxes.map((b) => b.x + b.w))
  const maxY = Math.max(...boxes.map((b) => b.y + b.h))
  const pad = 40
  const dark = project.canvasStyle === "blueprint"

  return (
    <svg viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      {boxes.map((b) => (
        <rect
          key={b.id}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          rx={10}
          fill={b.container ? "none" : dark ? "#1b2330" : "var(--color-muted)"}
          stroke={dark ? "#3a4656" : "var(--color-border)"}
          strokeWidth={b.container ? 4 : 3}
          strokeDasharray={b.container ? "14 10" : undefined}
        />
      ))}
    </svg>
  )
}

export function SchemesPage() {
  const router = useRouter()
  const projects = useProjectsStore((s) => s.projects)
  const entities = useEntities()
  const { openCreate, openRename, openDelete, duplicate, dialogs } = useSchemeActions()
  const [query, setQuery] = useState("")
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  // Сколько объектов реестра на каждой схеме
  const objectsPerScheme = useMemo(() => {
    const idx = diagramIndex(projects)
    const known = new Set(entities.map((e) => e.id))
    const per = new Map<string, Set<string>>()
    for (const [eid, places] of idx) {
      if (!known.has(eid)) continue
      for (const p of places) per.set(p.projectId, (per.get(p.projectId) || new Set()).add(eid))
    }
    return per
  }, [projects, entities])

  const list = useMemo(
    () =>
      [...projects]
        .filter((p) => !query.trim() || p.name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [projects, query]
  )

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 py-4 md:px-6 md:py-5">
      <PageHeader
        title="Схемы"
        description="Схемы сети, стендов и сервисов. Объекты на схемах — это записи реестра: правка в одном месте видна везде."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus aria-hidden="true" /> Новая схема
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск схемы" className="pl-8" />
      </div>

      {hydrated && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {list.map((p) => (
            <div key={p.id} className="group bg-card relative flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-md">
              <Link
                href={schemeHref(p.id)}
                className={cn("block aspect-[16/9] border-b p-3", p.canvasStyle === "blueprint" ? "bg-[#0d1117]" : "bg-muted/30")}
                aria-label={`Открыть схему ${p.name}`}
              >
                <SchemeThumb project={p} />
              </Link>
              <div className="flex items-start gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <Link href={schemeHref(p.id)} className="block truncate font-medium hover:underline">
                    {p.name}
                  </Link>
                  <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                    <span className="flex items-center gap-1">
                      <Workflow className="size-3" /> {p.nodes.length} узл. · {p.edges.length} связ.
                    </span>
                    <Link href={inventoryHref("devices", { scheme: p.id })} className="flex items-center gap-1 hover:underline">
                      <Boxes className="size-3" /> {objectsPerScheme.get(p.id)?.size ?? 0} в реестре
                    </Link>
                    <span>{dateFmt.format(p.updatedAt)}</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Действия: ${p.name}`}>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onSelect={() => router.push(schemeHref(p.id))}>
                      <Workflow /> Открыть
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openRename(p.id)}>
                      <Pencil /> Переименовать
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => duplicate(p.id)}>
                      <Copy /> Дублировать
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => openDelete(p.id)}>
                      <Trash2 /> Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={openCreate}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/40 flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm transition-colors"
          >
            <Plus className="size-5" /> Новая схема
          </button>
        </div>
      )}
      {dialogs}
    </div>
  )
}
