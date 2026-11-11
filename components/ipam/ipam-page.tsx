"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ChevronRight, Network, Pencil, Plus, Search, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PageHeader } from "@/components/app-shell/page-header"
import { EntityLink, VlanBadge } from "@/components/inventory/cells"
import { useEntities, useRelations } from "@/lib/inventory/hooks"
import { getInventory } from "@/lib/inventory/local-adapter"
import { buildLookups } from "@/lib/inventory/views"
import {
  DEFAULT_VRF,
  addressMap,
  buildPrefixTree,
  intToIp,
  intervalToCidrs,
  nextFreeIp,
  nextFreeSubnet,
  prefixUsage,
  type CellState,
  type PrefixNode,
} from "@/lib/inventory/ipam"
import type { Entity } from "@/lib/inventory/types"
import { useHydrated } from "@/hooks/use-hydrated"

import { IpDialog, PrefixDialog } from "./ipam-dialogs"

const fmt = new Intl.NumberFormat("ru-RU")

const CELL: Record<CellState, { cls: string; label: string }> = {
  network: { cls: "bg-muted-foreground/30", label: "адрес сети" },
  broadcast: { cls: "bg-muted-foreground/30", label: "broadcast" },
  gateway: { cls: "bg-violet-500", label: "шлюз" },
  used: { cls: "bg-sky-500", label: "занят" },
  dhcp: { cls: "bg-amber-400/70", label: "DHCP-пул" },
  child: { cls: "bg-indigo-400/50", label: "вложенная подсеть" },
  free: { cls: "bg-emerald-500/15 hover:bg-emerald-500/40", label: "свободен" },
}

function UsageBar({ node, thin }: { node: PrefixNode; thin?: boolean }) {
  const u = prefixUsage(node)
  const pct = (n: number) => `${u.usable ? (n / u.usable) * 100 : 0}%`
  return (
    <div className={cn("bg-emerald-500/15 flex overflow-hidden rounded-full", thin ? "h-1.5" : "h-2.5")} title={`занято ${Math.round(u.utilization * 100)}%`}>
      <div className="bg-sky-500" style={{ width: pct(u.used) }} />
      <div className="bg-indigo-400/60" style={{ width: pct(u.inChildren) }} />
      <div className="bg-amber-400/80" style={{ width: pct(u.dhcp) }} />
    </div>
  )
}

function TreeRow({
  node,
  depth,
  selectedId,
  onSelect,
  expanded,
  toggle,
  lk,
}: {
  node: PrefixNode
  depth: number
  selectedId?: string
  onSelect: (id: string) => void
  expanded: Set<string>
  toggle: (id: string) => void
  lk: ReturnType<typeof buildLookups>
}) {
  const open = expanded.has(node.entity.id)
  const u = prefixUsage(node)
  const vlan = node.entity.attrs.vlanId ? lk.byId.get(node.entity.attrs.vlanId) : undefined
  return (
    <>
      <div
        role="treeitem"
        aria-selected={selectedId === node.entity.id}
        tabIndex={0}
        onClick={() => onSelect(node.entity.id)}
        onKeyDown={(e) => e.key === "Enter" && onSelect(node.entity.id)}
        className={cn(
          "group flex cursor-pointer items-center gap-1.5 rounded-md py-1.5 pr-2 text-sm",
          selectedId === node.entity.id ? "bg-primary/10" : "hover:bg-muted/60"
        )}
        style={{ paddingLeft: 6 + depth * 14 }}
      >
        <button
          type="button"
          aria-label={open ? "Свернуть" : "Развернуть"}
          onClick={(e) => {
            e.stopPropagation()
            toggle(node.entity.id)
          }}
          className={cn("flex size-4 shrink-0 items-center justify-center", !node.children.length && "invisible")}
        >
          <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        </button>
        <span className="size-2 shrink-0 rounded-full" style={{ background: vlan?.kind === "vlan" ? vlan.attrs.color ?? "transparent" : "transparent" }} />
        <span className="font-mono text-[13px]">{node.entity.attrs.cidr}</span>
        {node.entity.name !== node.entity.attrs.cidr && <span className="text-muted-foreground truncate text-xs">{node.entity.name}</span>}
        <span className="text-muted-foreground ml-auto shrink-0 text-[11px] tabular-nums">{Math.round(u.utilization * 100)}%</span>
        <div className="w-12 shrink-0">
          <UsageBar node={node} thin />
        </div>
      </div>
      {open &&
        node.children.map((c) => (
          <TreeRow key={c.entity.id} node={c} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} expanded={expanded} toggle={toggle} lk={lk} />
        ))}
    </>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        {tone && <span className={cn("size-2 rounded-full", tone)} />}
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums">{fmt.format(value)}</div>
    </div>
  )
}

export function IpamPage() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const hydrated = useHydrated()
  const entities = useEntities()
  const relations = useRelations()
  const lk = useMemo(() => buildLookups(entities, relations), [entities, relations])

  const prefixes = useMemo(() => entities.filter((e): e is Entity<"prefix"> => e.kind === "prefix"), [entities])
  const ips = useMemo(() => entities.filter((e): e is Entity<"ipAddress"> => e.kind === "ipAddress"), [entities])
  const vrfs = useMemo(() => entities.filter((e): e is Entity<"vrf"> => e.kind === "vrf"), [entities])
  const vlans = useMemo(() => entities.filter((e): e is Entity<"vlan"> => e.kind === "vlan"), [entities])
  const owners = useMemo(
    () => entities.filter((e) => ["device", "service", "group", "external"].includes(e.kind)).sort((a, b) => a.name.localeCompare(b.name, "ru")),
    [entities]
  )
  const tree = useMemo(() => buildPrefixTree(prefixes, ips), [prefixes, ips])

  const selectedId = params.get("prefix") ?? undefined
  const select = (id?: string) => {
    const q = new URLSearchParams(params.toString())
    if (id) q.set("prefix", id)
    else q.delete("prefix")
    router.replace(`${pathname}?${q.toString()}`, { scroll: false })
  }
  const selected = selectedId ? tree.byId.get(selectedId) : undefined

  const [query, setQuery] = useState("")
  const [expandedState, setExpanded] = useState<Set<string> | null>(null)
  // По умолчанию раскрыты все уровни, где есть вложенные подсети
  const expanded = useMemo(() => expandedState ?? new Set([...tree.byId.values()].filter((n) => n.children.length).map((n) => n.entity.id)), [expandedState, tree])
  const toggle = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  const [prefixDialog, setPrefixDialog] = useState<{ edit?: Entity<"prefix">; cidr?: string; vrfId?: string } | null>(null)
  const [ipDialog, setIpDialog] = useState<{ address?: string; vrfId?: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [subnetLen, setSubnetLen] = useState(26)

  const vrfName = (id: string) => (id === DEFAULT_VRF ? "Глобальная таблица" : `VRF ${lk.byId.get(id)?.name ?? id}`)
  const q = query.trim().toLowerCase()
  const matches = (n: PrefixNode): boolean =>
    !q ||
    `${n.entity.attrs.cidr} ${n.entity.name} ${n.entity.description ?? ""} ${n.entity.attrs.vlanId ? lk.label(n.entity.attrs.vlanId) : ""}`.toLowerCase().includes(q) ||
    n.ips.some((ip) => `${ip.attrs.address} ${ip.attrs.dnsName ?? ""}`.toLowerCase().includes(q)) ||
    n.children.some(matches)

  const usage = selected ? prefixUsage(selected) : undefined
  const map = selected ? addressMap(selected) : null
  const freeIp = selected ? nextFreeIp(selected) : null
  const freeSubnet = selected ? nextFreeSubnet(selected, subnetLen) : null
  const diagramOwned = selected?.entity.source?.type === "diagram"

  return (
    <div className="flex min-h-0 flex-1">
      {/* Дерево подсетей */}
      <aside className="flex w-[340px] shrink-0 flex-col border-r">
        <div className="space-y-2 border-b p-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="CIDR, имя, адрес…" className="h-8 pl-8" />
            </div>
            <Button size="sm" className="h-8" onClick={() => setPrefixDialog({})}>
              <Plus className="size-4" /> Подсеть
            </Button>
          </div>
        </div>
        <div role="tree" className="min-h-0 flex-1 overflow-y-auto p-2">
          {hydrated &&
            [...tree.roots.entries()]
              .sort(([a], [b]) => (a === DEFAULT_VRF ? -1 : b === DEFAULT_VRF ? 1 : a.localeCompare(b)))
              .map(([vrf, roots]) => (
                <div key={vrf} className="mb-2">
                  <div className="text-muted-foreground px-1.5 pb-1 text-[11px] font-medium tracking-wide uppercase">{vrfName(vrf)}</div>
                  {roots.filter(matches).map((n) => (
                    <TreeRow key={n.entity.id} node={n} depth={0} selectedId={selectedId} onSelect={select} expanded={expanded} toggle={toggle} lk={lk} />
                  ))}
                </div>
              ))}
          {hydrated && tree.orphanIps.length > 0 && (
            <div className="mt-2 border-t px-1.5 pt-2">
              <div className="text-muted-foreground pb-1 text-[11px] font-medium tracking-wide uppercase">Вне подсетей · {tree.orphanIps.length}</div>
              {tree.orphanIps.map((ip) => (
                <div key={ip.id} className="flex items-center gap-2 py-0.5 text-xs">
                  <span className="font-mono">{ip.attrs.address}</span>
                  <span className="text-muted-foreground truncate">{lk.label(ip.attrs.assignedToId)}</span>
                </div>
              ))}
            </div>
          )}
          {hydrated && prefixes.length === 0 && (
            <div className="text-muted-foreground p-3 text-sm">
              Подсетей пока нет. Добавьте свою или опишите сети в панели «Сети» на схеме.
            </div>
          )}
        </div>
      </aside>

      {/* Выбранная подсеть */}
      <main className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
        {!selected || !usage ? (
          <>
            <PageHeader
              title="IPAM"
              description="Подсети, занятые и свободные адреса. Проверки: дубли подсетей в VRF, шлюз, DHCP-пулы, адреса вне подсетей."
            />
            {hydrated && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Подсетей" value={prefixes.length} />
                <Stat label="Адресов учтено" value={ips.length} tone="bg-sky-500" />
                <Stat label="Вне подсетей" value={tree.orphanIps.length} tone="bg-amber-400" />
                <Stat label="VRF" value={vrfs.length + 1} />
              </div>
            )}
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-sm">
              <Network className="size-8 opacity-50" />
              Выберите подсеть слева
            </div>
          </>
        ) : (
          <>
            <PageHeader
              title={
                <span className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-mono">{selected.entity.attrs.cidr}</span>
                  {selected.entity.name !== selected.entity.attrs.cidr && <span className="text-muted-foreground text-base font-normal">{selected.entity.name}</span>}
                </span>
              }
              description={
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>{vrfName(selected.vrfId)}</span>
                  {selected.entity.attrs.vlanId && <VlanBadge vlan={lk.byId.get(selected.entity.attrs.vlanId)} />}
                  {selected.entity.attrs.gateway && (
                    <span>
                      шлюз <span className="text-foreground font-mono">{selected.entity.attrs.gateway}</span>
                    </span>
                  )}
                  {selected.parent && (
                    <button type="button" onClick={() => select(selected.parent!.entity.id)} className="hover:underline">
                      ↑ <span className="font-mono">{selected.parent.entity.attrs.cidr}</span>
                    </button>
                  )}
                  {selected.entity.description && <span>{selected.entity.description}</span>}
                </span>
              }
              actions={
                <>
                  <Button variant="outline" size="sm" onClick={() => setPrefixDialog({ edit: selected.entity })}>
                    <Pencil className="size-3.5" /> Изменить
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    disabled={diagramOwned}
                    aria-label="Удалить подсеть"
                    title={diagramOwned ? "Подсеть нарисована на схеме — удалите её в панели «Сети»" : "Удалить подсеть"}
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              }
            />

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
              <Stat label="Полезных адресов" value={usage.usable} />
              <Stat label="Занято" value={usage.used} tone="bg-sky-500" />
              <Stat label="Во вложенных" value={usage.inChildren} tone="bg-indigo-400" />
              <Stat label="DHCP" value={usage.dhcp} tone="bg-amber-400" />
              <Stat label="Свободно" value={usage.free} tone="bg-emerald-500" />
            </div>
            <UsageBar node={selected} />

            {/* Поиск свободного */}
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-muted-foreground text-xs">Следующий свободный адрес</div>
                  <div className="font-mono text-base">{freeIp ?? "нет свободных"}</div>
                </div>
                <Button size="sm" disabled={!freeIp} onClick={() => setIpDialog({ address: freeIp ?? undefined, vrfId: selected.vrfId })}>
                  Занять
                </Button>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    Свободная подсеть
                    <select
                      value={subnetLen}
                      onChange={(e) => setSubnetLen(Number(e.target.value))}
                      className="bg-background rounded border px-1 font-mono text-xs"
                      aria-label="Размер подсети"
                    >
                      {Array.from({ length: 32 - selected.cidr.len }, (_, i) => selected.cidr.len + 1 + i)
                        .filter((l) => l <= 30)
                        .map((l) => (
                          <option key={l} value={l}>
                            /{l}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="font-mono text-base">{freeSubnet ?? "нет места"}</div>
                </div>
                <Button size="sm" variant="outline" disabled={!freeSubnet} onClick={() => setPrefixDialog({ cidr: freeSubnet ?? undefined, vrfId: selected.vrfId })}>
                  Создать
                </Button>
              </div>
            </div>

            {/* Карта адресов */}
            {map && (
              <section>
                <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="font-medium">Карта адресов</span>
                  {(["used", "gateway", "dhcp", "child", "free", "network"] as CellState[]).map((s) => (
                    <span key={s} className="text-muted-foreground flex items-center gap-1.5">
                      <span className={cn("size-2.5 rounded-sm", CELL[s].cls)} /> {CELL[s].label}
                    </span>
                  ))}
                </div>
                <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.min(32, map.length)}, minmax(0, 1fr))` }}>
                  {map.map((c) => {
                    const owner = c.ipEntity ? lk.label(c.ipEntity.attrs.assignedToId) : ""
                    const title = `${intToIp(c.ip)} · ${CELL[c.state].label}${c.ipEntity?.attrs.dnsName ? ` · ${c.ipEntity.attrs.dnsName}` : ""}${owner ? ` · ${owner}` : ""}`
                    return (
                      <button
                        key={c.ip}
                        type="button"
                        title={title}
                        aria-label={title}
                        onClick={() => {
                          if (c.state === "free") setIpDialog({ address: intToIp(c.ip), vrfId: selected.vrfId })
                          else if (c.state === "child") {
                            const child = selected.children.find((ch) => c.ip >= ch.cidr.first && c.ip <= ch.cidr.last)
                            if (child) select(child.entity.id)
                          } else if (c.ipEntity) router.push(`/inventory/ip?id=${c.ipEntity.id}`)
                        }}
                        className={cn("aspect-square min-h-3 rounded-[3px] transition-colors", CELL[c.state].cls)}
                      />
                    )
                  })}
                </div>
                <p className="text-muted-foreground mt-1.5 text-xs">Клик по свободной ячейке — занять адрес, по занятой — открыть в реестре.</p>
              </section>
            )}

            <div className="grid gap-5 xl:grid-cols-2">
              {/* Свободные диапазоны */}
              <section>
                <div className="mb-2 text-sm font-medium">Свободные диапазоны · {usage.freeRanges.length}</div>
                <div className="divide-y rounded-lg border">
                  {usage.freeRanges.slice(0, 50).map((r) => {
                    const count = r.end - r.start + 1
                    const blocks = intervalToCidrs(r)
                    return (
                      <div key={r.start} className="flex items-center gap-3 px-3 py-1.5 text-sm">
                        <span className="font-mono text-[13px]">
                          {intToIp(r.start)}
                          {count > 1 && <> – {intToIp(r.end)}</>}
                        </span>
                        <span className="text-muted-foreground ml-auto text-xs tabular-nums">{fmt.format(count)}</span>
                        <span className="text-muted-foreground hidden max-w-[45%] truncate font-mono text-[11px] md:inline" title={blocks.map((b) => `${intToIp(b.network)}/${b.len}`).join(", ")}>
                          {blocks.slice(0, 3).map((b) => `${intToIp(b.network)}/${b.len}`).join(", ")}
                          {blocks.length > 3 && ` +${blocks.length - 3}`}
                        </span>
                      </div>
                    )
                  })}
                  {usage.freeRanges.length === 0 && <div className="text-muted-foreground px-3 py-3 text-sm">Свободных адресов нет</div>}
                </div>
              </section>

              {/* Вложенные подсети и адреса */}
              <section className="space-y-5">
                {selected.children.length > 0 && (
                  <div>
                    <div className="mb-2 text-sm font-medium">Вложенные подсети · {selected.children.length}</div>
                    <div className="divide-y rounded-lg border">
                      {selected.children.map((c) => (
                        <button key={c.entity.id} type="button" onClick={() => select(c.entity.id)} className="hover:bg-muted/40 flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm">
                          <span className="font-mono text-[13px]">{c.entity.attrs.cidr}</span>
                          <span className="text-muted-foreground truncate text-xs">{c.entity.name !== c.entity.attrs.cidr ? c.entity.name : ""}</span>
                          <span className="ml-auto w-20">
                            <UsageBar node={c} thin />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm font-medium">
                    <span>Адреса · {selected.ips.length}</span>
                    <Button size="sm" variant="ghost" onClick={() => setIpDialog({ address: freeIp ?? undefined, vrfId: selected.vrfId })}>
                      <Plus className="size-3.5" /> Адрес
                    </Button>
                  </div>
                  <div className="divide-y rounded-lg border">
                    {[...selected.ips]
                      .sort((a, b) => (a.attrs.address ?? "").localeCompare(b.attrs.address ?? "", undefined, { numeric: true }))
                      .map((ip) => (
                        <div key={ip.id} className="flex items-center gap-3 px-3 py-1.5 text-sm">
                          <EntityLink id={ip.id} label={ip.attrs.address ?? ip.name}>
                            <span className="font-mono text-[13px]">{ip.attrs.address}</span>
                          </EntityLink>
                          <span className="text-muted-foreground truncate font-mono text-xs">{ip.attrs.dnsName}</span>
                          <span className="ml-auto truncate text-xs">
                            {ip.attrs.assignedToId ? <EntityLink id={ip.attrs.assignedToId} label={lk.label(ip.attrs.assignedToId)} /> : <span className="text-muted-foreground">резерв</span>}
                          </span>
                        </div>
                      ))}
                    {selected.ips.length === 0 && <div className="text-muted-foreground px-3 py-3 text-sm">Адресов нет</div>}
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      <PrefixDialog
        open={!!prefixDialog}
        onOpenChange={(o) => !o && setPrefixDialog(null)}
        tree={tree}
        vrfs={vrfs}
        vlans={vlans}
        initial={prefixDialog?.edit}
        defaults={prefixDialog?.edit ? undefined : { cidr: prefixDialog?.cidr, vrfId: prefixDialog?.vrfId }}
        onSaved={(id) => select(id)}
      />
      <IpDialog open={!!ipDialog} onOpenChange={(o) => !o && setIpDialog(null)} tree={tree} owners={owners} defaults={ipDialog ?? undefined} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить подсеть {selected?.entity.attrs.cidr}?</AlertDialogTitle>
            <AlertDialogDescription>
              Адреса не удалятся: они перейдут в {selected?.parent ? `родительскую подсеть ${selected.parent.entity.attrs.cidr}` : "«вне подсетей»"}.
              Вложенные подсети поднимутся на уровень выше.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                if (!selected) return
                const parent = selected.parent?.entity.id
                const res = getInventory().apply([{ op: "delete", id: selected.entity.id }], "registry")
                if (res.ok) {
                  toast.success(`Подсеть ${selected.entity.attrs.cidr} удалена`)
                  select(parent)
                }
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
