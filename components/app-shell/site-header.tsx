"use client"
// Основа — ReUI block app-shell-12 (reui.io, лицензия команды). Адаптировано под проект.

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment } from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { INVENTORY_AREAS, sectionBySlug } from "@/lib/navigation"
import { useProjectsStore } from "@/store/projectsStore"
import { useHydrated } from "@/hooks/use-hydrated"

import { SchemeToolbar } from "./scheme-toolbar"
import { SearchMenu } from "./search-menu"

type Crumb = { label: string; href?: string }

function useCrumbs(): { crumbs: Crumb[]; schemeId?: string } {
  const pathname = usePathname()
  const storedProjects = useProjectsStore((s) => s.projects)
  const projects = useHydrated() ? storedProjects : []
  const parts = pathname.split("/").filter(Boolean)

  if (parts[0] === "schemes") {
    if (!parts[1]) return { crumbs: [{ label: "Проектирование" }, { label: "Схемы" }] }
    const id = decodeURIComponent(parts[1])
    const name = projects.find((p) => p.id === id)?.name ?? "Схема"
    return { crumbs: [{ label: "Схемы", href: "/schemes" }, { label: name }], schemeId: id }
  }
  if (parts[0] === "inventory") {
    const section = sectionBySlug(parts[1] ?? "")
    const area = INVENTORY_AREAS.find((a) => a.sections.some((s) => s.slug === section?.slug))
    return { crumbs: [{ label: "Реестр" }, ...(area ? [{ label: area.label }] : []), { label: section?.label ?? "Раздел" }] }
  }
  if (parts[0] === "issues") return { crumbs: [{ label: "Данные" }, { label: "Проблемы" }] }
  return { crumbs: [] }
}

export function SiteHeader() {
  const { crumbs, schemeId } = useCrumbs()

  return (
    <header className="bg-background sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="-ml-1 md:hidden" />
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1
              return (
                <Fragment key={`${c.label}-${i}`}>
                  <BreadcrumbItem className={last ? "min-w-0" : "hidden md:block"}>
                    {last ? (
                      <BreadcrumbPage className="truncate font-medium">{c.label}</BreadcrumbPage>
                    ) : c.href ? (
                      <BreadcrumbLink asChild>
                        <Link href={c.href}>{c.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <span>{c.label}</span>
                    )}
                  </BreadcrumbItem>
                  {!last && <BreadcrumbSeparator className="hidden md:block" />}
                </Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {schemeId && <SchemeToolbar projectId={schemeId} />}
        <SearchMenu />
      </div>
    </header>
  )
}
