"use client"
// Основа — ReUI block app-shell-12 (reui.io, лицензия команды). Адаптировано: поиск по схемам и реестру.

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { SearchIcon, Workflow } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import AppIcon from "@/components/canvas/AppIcon"
import { useEntities } from "@/lib/inventory/hooks"
import { KIND_LABELS } from "@/lib/inventory/types"
import { INVENTORY_SECTIONS, inventoryHref, schemeHref, sectionByKind } from "@/lib/navigation"
import { useProjectsStore } from "@/store/projectsStore"

const MAX_PER_GROUP = 8

export function SearchMenu() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const router = useRouter()
  const projects = useProjectsStore((s) => s.projects)
  const entities = useEntities()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Объекты, у которых есть раздел реестра; ищем по имени и ключевым полям
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out: { id: string; kind: string; name: string; hint: string; href: string; icon: string }[] = []
    for (const e of entities) {
      const section = sectionByKind(e.kind)
      if (!section) continue
      const attrs = e.attrs as Record<string, unknown>
      const hay = [e.name, attrs.hostname, attrs.address, attrs.cidr, attrs.model, attrs.url, attrs.serial, attrs.dnsName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!hay.includes(q)) continue
      out.push({
        id: e.id,
        kind: e.kind,
        name: e.name,
        hint: [attrs.address, attrs.hostname, attrs.cidr, attrs.model].filter(Boolean).join(" · ") as string,
        href: inventoryHref(section.slug, { id: e.id }),
        icon: (attrs.icon as string) || section.icon,
      })
    }
    return out
  }, [entities, query])

  const schemeHits = projects.filter((p) => !query.trim() || p.name.toLowerCase().includes(query.trim().toLowerCase()))
  const go = (href: string) => {
    setOpen(false)
    setQuery("")
    router.push(href)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Поиск"
        onClick={() => setOpen(true)}
        className="text-muted-foreground h-8 w-44 justify-start gap-2 px-2.5 font-normal lg:w-56"
      >
        <SearchIcon className="size-4" aria-hidden="true" />
        <span className="truncate">Поиск…</span>
        <Kbd className="ml-auto">Ctrl K</Kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader className="sr-only">
          <DialogTitle>Поиск</DialogTitle>
          <DialogDescription>Схемы и объекты реестра</DialogDescription>
        </DialogHeader>
        <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5">
        <CommandInput placeholder="Имя, IP, hostname, CIDR, модель…" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>Ничего не найдено</CommandEmpty>
          {schemeHits.length > 0 && (
            <CommandGroup heading="Схемы">
              {schemeHits.slice(0, MAX_PER_GROUP).map((p) => (
                <CommandItem key={p.id} value={`scheme-${p.id}`} onSelect={() => go(schemeHref(p.id))}>
                  <Workflow />
                  {p.name}
                  <span className="text-muted-foreground ml-auto text-xs">{p.nodes.length} узл.</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {!query.trim() && (
            <CommandGroup heading="Реестр">
              {INVENTORY_SECTIONS.map((s) => (
                <CommandItem key={s.slug} value={`section-${s.slug}`} onSelect={() => go(inventoryHref(s.slug))}>
                  <AppIcon value={s.icon} brandColor={false} />
                  {s.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {INVENTORY_SECTIONS.map((s) => {
            const hits = results.filter((r) => r.kind === s.kind)
            if (!hits.length) return null
            return (
              <CommandGroup key={s.slug} heading={`${s.label} · ${hits.length}`}>
                {hits.slice(0, MAX_PER_GROUP).map((r) => (
                  <CommandItem key={r.id} value={`e-${r.id}`} onSelect={() => go(r.href)}>
                    <AppIcon value={r.icon} />
                    <span className="truncate">{r.name || KIND_LABELS[s.kind]}</span>
                    {r.hint && <span className="text-muted-foreground ml-auto truncate font-mono text-xs">{r.hint}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )
          })}
        </CommandList>
        </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
