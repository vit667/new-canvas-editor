"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import AppIcon from "@/components/canvas/AppIcon"
import { getInventory } from "@/lib/inventory/local-adapter"
import type { Entity, EntityInput } from "@/lib/inventory/types"
import { inventoryHref, schemeHref, sectionByKind } from "@/lib/navigation"

/** Записать правку объекта в реестр (дальше она сама разойдётся по схемам) */
export function updateEntity(e: Entity, patch: { name?: string; attrs?: Record<string, unknown>; description?: string }): boolean {
  const next = {
    ...e,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description || undefined } : {}),
    attrs: { ...e.attrs, ...(patch.attrs || {}) },
  } as EntityInput
  for (const [k, v] of Object.entries(patch.attrs || {})) if (v === "" || v === undefined) delete (next.attrs as Record<string, unknown>)[k]
  const res = getInventory().apply([{ op: "upsert", entity: next }], "registry")
  if (!res.ok) {
    toast.error(res.issues[0]?.message ?? "Не удалось сохранить")
    return false
  }
  const warn = res.issues.find((i) => i.level === "warning")
  if (warn) toast.warning(warn.message)
  return true
}

/** Текст, который правится двойным кликом прямо в таблице */
export function EditableText({
  value,
  onSave,
  mono,
  placeholder = "—",
  className,
}: {
  value?: string
  onSave: (v: string) => boolean | void
  mono?: boolean
  placeholder?: string
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (editing) ref.current?.select()
  }, [editing])

  if (editing) {
    const commit = () => {
      setEditing(false)
      if ((draft ?? "") !== (value ?? "")) onSave(draft.trim())
    }
    return (
      <Input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") setEditing(false)
        }}
        className={cn("h-7 px-1.5 text-sm", mono && "font-mono")}
      />
    )
  }
  return (
    <span
      role="button"
      tabIndex={0}
      title="Двойной клик — изменить"
      onDoubleClick={(e) => {
        e.stopPropagation()
        setDraft(value ?? "")
        setEditing(true)
      }}
      onKeyDown={(e) => {
        if (e.key === "F2") {
          setDraft(value ?? "")
          setEditing(true)
        }
      }}
      className={cn(
        "-mx-1 cursor-text truncate rounded px-1 hover:bg-muted/80",
        mono && "font-mono text-[13px]",
        !value && "text-muted-foreground",
        className
      )}
    >
      {value || placeholder}
    </span>
  )
}

export function NameCell({ entity, issues, icon }: { entity: Entity; issues: number; icon: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex size-5 shrink-0 items-center justify-center">
        <AppIcon value={icon} className="size-4" />
      </span>
      <EditableText value={entity.name} onSave={(v) => !!v && updateEntity(entity, { name: v })} className="font-medium" />
      {issues > 0 && <AlertTriangle className="size-3.5 shrink-0 text-amber-500" aria-label={`Проблем: ${issues}`} />}
    </div>
  )
}

/** Ссылка на другой объект реестра (открывает его раздел с карточкой) */
export function EntityLink({ id, label, children }: { id?: string; label: string; children?: ReactNode }) {
  const e = id ? getInventory().get(id) : undefined
  const section = e ? sectionByKind(e.kind) : undefined
  if (!id || !e) return <span className="text-muted-foreground">{label || "—"}</span>
  if (!section) return <span>{label}</span>
  return (
    <Link
      href={inventoryHref(section.slug, { id })}
      onClick={(ev) => ev.stopPropagation()}
      className="truncate underline-offset-2 hover:underline"
    >
      {children ?? label}
    </Link>
  )
}

export function VlanBadge({ vlan }: { vlan?: Entity }) {
  if (!vlan || vlan.kind !== "vlan") return <span className="text-muted-foreground">—</span>
  return (
    <EntityLink id={vlan.id} label={vlan.name}>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={{ background: vlan.attrs.color ?? "var(--color-muted-foreground)" }} />
        {vlan.attrs.vid != null && <span className="text-muted-foreground font-mono text-xs">{vlan.attrs.vid}</span>}
        {vlan.name}
      </span>
    </EntityLink>
  )
}

export function SchemesCell({ places, names }: { places: { projectId: string; nodeId: string }[]; names: Map<string, string> }) {
  const seen = new Set<string>()
  const uniq = places.filter((p) => (seen.has(p.projectId) ? false : (seen.add(p.projectId), true)))
  if (!uniq.length) return <span className="text-muted-foreground text-xs">нет</span>
  return (
    <div className="flex flex-wrap gap-1">
      {uniq.map((p) => (
        <Link
          key={p.projectId}
          href={`${schemeHref(p.projectId)}?node=${encodeURIComponent(p.nodeId)}`}
          onClick={(e) => e.stopPropagation()}
          title="Показать на схеме"
          className="bg-muted hover:bg-muted/70 rounded px-1.5 py-0.5 text-xs"
        >
          {names.get(p.projectId) ?? p.projectId}
        </Link>
      ))}
    </div>
  )
}

export function StatusPill({ tone, children }: { tone: "free" | "busy" | "off"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "free" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        tone === "busy" && "bg-sky-500/10 text-sky-700 dark:text-sky-400",
        tone === "off" && "bg-muted text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "free" && "bg-emerald-500",
          tone === "busy" && "bg-sky-500",
          tone === "off" && "bg-muted-foreground/50"
        )}
      />
      {children}
    </span>
  )
}
