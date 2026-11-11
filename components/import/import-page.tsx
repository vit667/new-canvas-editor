"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { AlertTriangle, ArrowRight, CircleCheck, FileUp, RotateCcw, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/app-shell/page-header"
import { ATTR_LABELS } from "@/components/inventory/entity-details"
import { useEntities, useInventoryLookups } from "@/lib/inventory/hooks"
import { getInventory } from "@/lib/inventory/local-adapter"
import { KIND_LABELS, RELATION_LABELS, type EntityKind } from "@/lib/inventory/types"
import { PARSERS, detectParser, parserById, type ImportResult, type ParserId } from "@/lib/inventory/import"
import { applyPlan, buildPlan, type ImportPlan, type PlanItem } from "@/lib/inventory/import/reconcile"
import { inventoryHref, sectionByKind } from "@/lib/navigation"

const selectClass =
  "border-input bg-background h-9 rounded-md border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"

const ACTION: Record<PlanItem["action"], { label: string; cls: string }> = {
  create: { label: "новый", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  update: { label: "изменится", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  same: { label: "без изменений", cls: "bg-muted text-muted-foreground" },
}

export function ImportPage() {
  const [text, setText] = useState("")
  const [parserId, setParserId] = useState<ParserId | "auto">("auto")
  const [hostId, setHostId] = useState("")
  const [clusterName, setClusterName] = useState("")
  const [result, setResult] = useState<ImportResult | null>(null)
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [applied, setApplied] = useState<{ count: number; kinds: EntityKind[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const entities = useEntities()
  const lk = useInventoryLookups()

  const detected = useMemo(() => (text.trim() ? detectParser(text) : null), [text])
  const effective = parserId === "auto" ? detected?.parser : parserById(parserId)
  const hosts = useMemo(
    () => entities.filter((e) => ["device", "group", "service", "vm", "container", "host"].includes(e.kind)).sort((a, b) => a.name.localeCompare(b.name, "ru")),
    [entities]
  )

  const loadFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const parts = await Promise.all(Array.from(files).map((f) => f.text()))
    setText((t) => [t.trim(), ...parts].filter(Boolean).join("\n\n"))
    if (fileRef.current) fileRef.current.value = ""
  }

  const analyze = () => {
    if (!effective) return
    const res = effective.parse(text, { hostEntityId: hostId || undefined, clusterName: clusterName || undefined })
    const p = buildPlan(getInventory(), res)
    setResult(res)
    setPlan(p)
    setApplied(null)
    setSelected(new Set(p.items.filter((i) => i.action !== "same").map((i) => i.key)))
  }

  const apply = () => {
    if (!plan || !result) return
    const res = applyPlan(getInventory(), plan, selected, result.parser)
    if (res.skipped.length) {
      toast.warning(`Применено с пропусками: ${res.skipped.length}`, { description: res.skipped.map((s) => `${s.name}: ${s.message}`).join("\n") })
    } else {
      toast.success(`Импортировано: ${res.applied}`)
    }
    const kinds = [...new Set(plan.items.filter((i) => selected.has(i.key)).map((i) => i.kind))]
    setApplied({ count: res.applied, kinds })
    // План пересчитываем по обновлённому реестру — сразу видно, что стало «без изменений»
    const p = buildPlan(getInventory(), result)
    setPlan(p)
    setSelected(new Set(p.items.filter((i) => i.action !== "same").map((i) => i.key)))
  }

  const reset = () => {
    setText("")
    setResult(null)
    setPlan(null)
    setApplied(null)
    setParserId("auto")
  }

  const groups = useMemo(() => {
    const m = new Map<EntityKind, PlanItem[]>()
    for (const it of plan?.items ?? []) m.set(it.kind, [...(m.get(it.kind) || []), it])
    return [...m.entries()]
  }, [plan])

  // Имена будущих объектов плана (их ещё нет в реестре)
  const planNames = useMemo(() => new Map((plan?.items ?? []).map((i) => [i.id, i.name])), [plan])
  const fmt = (field: string, v: unknown): string => {
    if (v === undefined || v === null || v === "") return "—"
    if (typeof v === "string" && lk?.byId.has(v)) return lk.label(v)
    if (typeof v === "string" && planNames.has(v)) return `${planNames.get(v)} (новый)`
    if (Array.isArray(v)) return v.map((x) => fmt(field, x)).join(", ")
    if (typeof v === "object") return JSON.stringify(v)
    if (typeof v === "boolean") return v ? "да" : "нет"
    return String(v)
  }

  const toggle = (keys: string[], on: boolean) => {
    const next = new Set(selected)
    for (const k of keys) on ? next.add(k) : next.delete(k)
    setSelected(next)
  }

  const counts = plan
    ? {
        create: plan.items.filter((i) => i.action === "create").length,
        update: plan.items.filter((i) => i.action === "update").length,
        same: plan.items.filter((i) => i.action === "same").length,
        rels: plan.relations.filter((r) => r.action === "create").length,
      }
    : null

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 py-4 md:px-6 md:py-5">
      <PageHeader
        title="Импорт"
        description="Вставьте вывод команд с оборудования или хоста. Объекты сверяются с реестром по серийному номеру, hostname, адресу и имени порта — повторный импорт не создаёт дублей."
        actions={
          (text || plan) && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="size-3.5" /> Заново
            </Button>
          )
        }
      />

      {/* 1. Ввод */}
      <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div
          className="relative"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            loadFiles(e.dataTransfer.files)
          }}
        >
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setPlan(null)
            }}
            placeholder={"Вставьте вывод сюда или перетащите файлы.\n\nНапример: show running-config + show version + show inventory + show cdp neighbors detail — всё одним текстом."}
            className="h-80 min-h-64 resize-y overflow-auto font-mono text-xs [field-sizing:fixed]"
            spellCheck={false}
          />
          <input ref={fileRef} type="file" multiple hidden accept=".txt,.log,.cfg,.conf,.rsc,.json,text/plain,application/json" onChange={(e) => loadFiles(e.target.files)} />
          <Button type="button" variant="outline" size="sm" className="absolute right-2 bottom-2" onClick={() => fileRef.current?.click()}>
            <FileUp className="size-3.5" /> Файлы
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="grid gap-1.5">
            <Label htmlFor="imp-format">Формат</Label>
            <select id="imp-format" value={parserId} onChange={(e) => setParserId(e.target.value as ParserId | "auto")} className={selectClass}>
              <option value="auto">Определить автоматически{detected ? ` — ${detected.parser.label}` : ""}</option>
              {PARSERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            {effective && <p className="text-muted-foreground text-xs">Команды: {effective.hint}</p>}
            {text.trim() && !effective && <p className="text-xs text-amber-700 dark:text-amber-400">Формат не распознан — выберите вручную</p>}
          </div>

          {effective?.id === "sockets" && (
            <div className="grid gap-1.5">
              <Label htmlFor="imp-host">С какого хоста вывод</Label>
              <select id="imp-host" value={hostId} onChange={(e) => setHostId(e.target.value)} className={selectClass}>
                <option value="">— выберите —</option>
                {hosts.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} · {KIND_LABELS[h.kind]}
                  </option>
                ))}
              </select>
            </div>
          )}
          {effective?.id === "proxmox" && (
            <div className="grid gap-1.5">
              <Label htmlFor="imp-cluster">Имя кластера</Label>
              <Input id="imp-cluster" value={clusterName} placeholder="Proxmox" onChange={(e) => setClusterName(e.target.value)} />
            </div>
          )}

          <Button className="mt-auto" disabled={!effective || !text.trim() || (effective.id === "sockets" && !hostId)} onClick={analyze}>
            <Sparkles className="size-4" /> Разобрать и сверить
          </Button>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Сейчас: Cisco IOS/IOS-XE, Huawei VRP, MikroTik, ss/netstat, Proxmox. Скоро: Aruba AOS-CX, Palo Alto, RVTools.
          </p>
        </div>
      </section>

      {/* 2. Сверка */}
      {result && plan && counts && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2 className="text-base font-semibold">{result.title}</h2>
            <div className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
              {Object.entries(result.stats).map(([k, v]) => (
                <span key={k}>
                  {k}: <span className="text-foreground tabular-nums">{v}</span>
                </span>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs">
              <span className={cn("rounded-full px-2 py-0.5", ACTION.create.cls)}>новых {counts.create}</span>
              <span className={cn("rounded-full px-2 py-0.5", ACTION.update.cls)}>изменится {counts.update}</span>
              <span className={cn("rounded-full px-2 py-0.5", ACTION.same.cls)}>без изменений {counts.same}</span>
              {counts.rels > 0 && <span className="text-muted-foreground">+ связей {counts.rels}</span>}
            </div>
          </div>

          {plan.warnings.length > 0 && (
            <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
              {plan.warnings.map((w) => (
                <div key={w} className="flex items-start gap-1.5 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="mt-px size-3.5 shrink-0" /> {w}
                </div>
              ))}
            </div>
          )}

          {applied && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
              <CircleCheck className="size-4 text-emerald-600" /> Применено изменений: {applied.count}.
              {applied.kinds.map((k) => {
                const s = sectionByKind(k)
                return s ? (
                  <Link key={k} href={inventoryHref(s.slug)} className="text-xs underline-offset-2 hover:underline">
                    {s.label} <ArrowRight className="inline size-3" />
                  </Link>
                ) : null
              })}
              {applied.kinds.some((k) => k === "prefix" || k === "ipAddress") && (
                <Link href="/ipam" className="text-xs underline-offset-2 hover:underline">
                  IPAM <ArrowRight className="inline size-3" />
                </Link>
              )}
            </div>
          )}

          <div className="space-y-4">
            {groups.map(([kind, items]) => {
              const actionable = items.filter((i) => i.action !== "same")
              const allOn = actionable.length > 0 && actionable.every((i) => selected.has(i.key))
              return (
                <div key={kind} className="overflow-hidden rounded-lg border">
                  <div className="bg-muted/40 flex items-center gap-2 border-b px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Выбрать все: ${KIND_LABELS[kind]}`}
                      checked={allOn}
                      disabled={!actionable.length}
                      onChange={(e) => toggle(actionable.map((i) => i.key), e.target.checked)}
                    />
                    <span className="text-sm font-medium">{KIND_LABELS[kind]}</span>
                    <span className="text-muted-foreground text-xs">{items.length}</span>
                  </div>
                  <div className="divide-y">
                    {items.map((it) => (
                      <label key={it.key} className={cn("flex items-start gap-3 px-3 py-2 text-sm", it.action === "same" ? "opacity-60" : "cursor-pointer hover:bg-muted/30")}>
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selected.has(it.key)}
                          disabled={it.action === "same"}
                          onChange={(e) => toggle([it.key], e.target.checked)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2">
                            <span className="font-medium">{it.kind === "interface" && lk ? (lk.byId.has(it.id) ? lk.label(it.id) : it.name) : it.name}</span>
                            {it.matchedBy && <span className="text-muted-foreground text-xs">найден по: {it.matchedBy}</span>}
                            {it.draft.description && it.action === "create" && <span className="text-muted-foreground truncate text-xs">{it.draft.description}</span>}
                          </div>
                          {it.changes.length > 0 && (
                            <div className="mt-1 space-y-0.5 text-xs">
                              {it.changes.map((c) => (
                                <div key={c.field} className="flex flex-wrap items-baseline gap-x-1.5">
                                  <span className="text-muted-foreground">{ATTR_LABELS[c.field] ?? c.field}:</span>
                                  <span className="text-muted-foreground line-through decoration-1">{fmt(c.field, c.from)}</span>
                                  <ArrowRight className="text-muted-foreground size-3 self-center" />
                                  <span className="font-mono">{fmt(c.field, c.to)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", ACTION[it.action].cls)}>{ACTION[it.action].label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
            {plan.relations.length > 0 && (
              <div className="rounded-lg border p-3 text-sm">
                <div className="mb-1 font-medium">Связи · {plan.relations.length}</div>
                <div className="text-muted-foreground grid gap-0.5 text-xs">
                  {plan.relations.slice(0, 30).map(({ rel, action }) => (
                    <div key={rel.id} className={action === "same" ? "opacity-60" : undefined}>
                      {lk?.label(rel.fromId) ?? rel.fromId} — {RELATION_LABELS[rel.type]}
                      {typeof rel.props?.port === "number" && `:${rel.props.port}`} → {lk?.label(rel.toId) ?? rel.toId}
                      {action === "same" && " (уже есть)"}
                    </div>
                  ))}
                  {plan.relations.length > 30 && <div>…и ещё {plan.relations.length - 30}</div>}
                </div>
                <p className="text-muted-foreground mt-1 text-[11px]">Связи создаются для объектов, которые есть в реестре или выбраны выше.</p>
              </div>
            )}
          </div>

          <div className="bg-background sticky bottom-0 flex items-center gap-3 border-t py-3">
            <Button onClick={apply} disabled={selected.size === 0}>
              Применить ({selected.size})
            </Button>
            <span className="text-muted-foreground text-xs">Новые объекты, на которые ссылаются выбранные (устройство порта, VLAN), добавятся сами.</span>
          </div>
        </section>
      )}
    </div>
  )
}
