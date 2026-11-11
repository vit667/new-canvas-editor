"use client"
// Основа — ReUI block app-shell-12 (nav-projects). Адаптировано: последние схемы с действиями.

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { ChevronDownIcon, Copy, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useProjectsStore } from "@/store/projectsStore"
import { schemeHref } from "@/lib/navigation"
import { useSchemeActions } from "@/components/schemes/scheme-actions"
import { useHydrated } from "@/hooks/use-hydrated"

import { ItemActionMenu } from "./item-action-menu"

const LIMIT = 8

/** Цветная точка: тёмная схема (blueprint) или обычная */
function SchemeDot({ blueprint }: { blueprint: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-2 shrink-0 rounded-full", blueprint ? "bg-sky-500" : "bg-muted-foreground/40")}
    />
  )
}

export function NavSchemes() {
  const [open, setOpen] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const storedProjects = useProjectsStore((s) => s.projects)
  const hydrated = useHydrated()
  const projects = hydrated ? storedProjects : []
  const { openCreate, openRename, openDelete, duplicate, dialogs } = useSchemeActions()

  const recent = useMemo(() => [...projects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, LIMIT), [projects])

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel
        asChild
        className="focus-visible:ring-sidebar-ring w-full cursor-pointer focus-visible:ring-2 focus-visible:outline-none"
      >
        <button type="button" onClick={() => setOpen((p) => !p)} aria-expanded={open} aria-controls="recent-schemes">
          Недавние схемы
          <ChevronDownIcon
            className={cn("ml-auto size-4 shrink-0 opacity-60 transition-transform duration-200", !open && "-rotate-90")}
            aria-hidden="true"
          />
        </button>
      </SidebarGroupLabel>
      <SidebarGroupAction title="Новая схема" onClick={openCreate} className="right-8">
        <Plus aria-hidden="true" />
        <span className="sr-only">Новая схема</span>
      </SidebarGroupAction>

      {open && (
        <SidebarGroupContent id="recent-schemes">
          <SidebarMenu className="gap-0.25">
            {recent.map((p) => (
              <SidebarMenuItem key={p.id}>
                <SidebarMenuButton tooltip={p.name} isActive={pathname === schemeHref(p.id)} asChild>
                  <Link href={schemeHref(p.id)}>
                    <SchemeDot blueprint={p.canvasStyle === "blueprint"} />
                    <span className="min-w-0 truncate">{p.name}</span>
                    <span className="text-muted-foreground ml-auto pr-5 text-[11px] tabular-nums">{p.nodes.length}</span>
                  </Link>
                </SidebarMenuButton>
                <ItemActionMenu
                  label={p.name}
                  actions={[
                    { id: "open", label: "Открыть", icon: <ExternalLink />, onSelect: () => router.push(schemeHref(p.id)) },
                    { id: "rename", label: "Переименовать", icon: <Pencil />, onSelect: () => openRename(p.id) },
                    { id: "duplicate", label: "Дублировать", icon: <Copy />, onSelect: () => duplicate(p.id) },
                    { id: "delete", label: "Удалить", icon: <Trash2 />, destructive: true, onSelect: () => openDelete(p.id) },
                  ]}
                />
              </SidebarMenuItem>
            ))}
            {projects.length > LIMIT && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="text-muted-foreground">
                  <Link href="/schemes">Все схемы · {projects.length}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {hydrated && projects.length === 0 && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={openCreate} className="text-muted-foreground">
                  <Plus /> Создать первую схему
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
      {dialogs}
    </SidebarGroup>
  )
}
