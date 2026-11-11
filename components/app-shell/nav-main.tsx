"use client"
// Основа — ReUI block app-shell-12 (reui.io, лицензия команды). Адаптировано под проект.

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState, type ReactNode } from "react"
import { AlertTriangle, ChevronRightIcon, Download, Workflow } from "lucide-react"

import { Badge } from "@/components/reui/badge"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import AppIcon from "@/components/canvas/AppIcon"
import { INVENTORY_AREAS, inventoryHref } from "@/lib/navigation"
import { useEntities, useInventoryIssues, useRelations } from "@/lib/inventory/hooks"
import { useProjectsStore } from "@/store/projectsStore"
import { useHydrated } from "@/hooks/use-hydrated"

type NavChild = { id: string; label: string; href?: string; isActive?: boolean; soon?: boolean; count?: number }
type NavItem = {
  id: string
  label: string
  icon: ReactNode
  href?: string
  badge?: string | number
  badgeTone?: "default" | "warning"
  isActive?: boolean
  soon?: boolean
  children?: NavChild[]
}
type NavGroup = { id: string; label?: string; items: NavItem[] }

const SoonBadge = () => (
  <Badge variant="outline" className="ml-auto h-5 rounded-full px-2 text-[10px] font-medium">
    Скоро
  </Badge>
)

/** Меню строится из навигации (lib/navigation) + живых счётчиков реестра и схем */
function useNavGroups(): NavGroup[] {
  const pathname = usePathname()
  const storedSchemes = useProjectsStore((s) => s.projects.length)
  const schemes = useHydrated() ? storedSchemes : 0
  const entities = useEntities()
  const issues = useInventoryIssues()
  const relations = useRelations()

  return useMemo(() => {
    const count = new Map<string, number>()
    for (const e of entities) count.set(e.kind, (count.get(e.kind) || 0) + 1)
    // «Кабели и связи» = кабели + подключения со схем
    count.set("cable", (count.get("cable") || 0) + relations.filter((r) => r.type === "connected_to").length)
    const errors = issues.filter((i) => i.level === "error").length

    return [
      {
        id: "design",
        label: "Проектирование",
        items: [
          {
            id: "schemes",
            label: "Схемы",
            icon: <Workflow aria-hidden="true" />,
            href: "/schemes",
            badge: schemes || undefined,
            isActive: pathname === "/schemes",
          },
        ],
      },
      {
        id: "inventory",
        label: "Реестр",
        items: INVENTORY_AREAS.map((area) => ({
          id: area.id,
          label: area.label,
          icon: <AppIcon value={area.icon} brandColor={false} />,
          children: area.sections.map((s) =>
            "soon" in s
              ? { id: s.slug, label: s.label, soon: true }
              : "href" in s
              ? { id: s.slug, label: s.label, href: s.href, isActive: pathname === s.href }
              : {
                  id: s.slug,
                  label: s.label,
                  href: inventoryHref(s.slug),
                  isActive: pathname === `/inventory/${s.slug}`,
                  count: count.get(s.kind) || 0,
                }
          ),
        })),
      },
      {
        id: "data",
        label: "Данные",
        items: [
          {
            id: "issues",
            label: "Проблемы",
            icon: <AlertTriangle aria-hidden="true" />,
            href: "/issues",
            badge: issues.length || undefined,
            badgeTone: errors ? "warning" : "default",
            isActive: pathname === "/issues",
          },
          { id: "import", label: "Импорт", icon: <Download aria-hidden="true" />, soon: true },
        ],
      },
    ]
  }, [pathname, schemes, entities, issues, relations])
}

function NavSubItem({ child }: { child: NavChild }) {
  if (child.soon || !child.href) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton aria-disabled="true" className="pointer-events-none opacity-60">
          <span className="truncate">{child.label}</span>
          <SoonBadge />
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    )
  }
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={child.isActive}>
        <Link href={child.href}>
          <span className="truncate">{child.label}</span>
          {!!child.count && <span className="text-muted-foreground ml-auto text-[11px] tabular-nums">{child.count}</span>}
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

// Свёрнутый сайдбар: подпункты открываются боковым меню у иконки
function CollapsedNavItem({ item }: { item: NavItem & { children: NavChild[] } }) {
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton tooltip={item.label} isActive={item.children.some((c) => c.isActive)} aria-label={item.label}>
            {item.icon}
            <span>{item.label}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={8} className="min-w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
            {item.children.map((child) =>
              child.soon || !child.href ? (
                <DropdownMenuItem key={child.id} disabled>
                  {child.label}
                  <SoonBadge />
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem key={child.id} asChild>
                  <Link href={child.href}>
                    {child.label}
                    {!!child.count && <span className="text-muted-foreground ml-auto text-xs tabular-nums">{child.count}</span>}
                  </Link>
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

// Развёрнутый сайдбар: подпункты раскрываются под пунктом
function ExpandedNavItem({ item, open, onToggle }: { item: NavItem & { children: NavChild[] }; open: boolean; onToggle: () => void }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.label}
        isActive={!open && item.children.some((c) => c.isActive)}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`subnav-${item.id}`}
      >
        {item.icon}
        <span>{item.label}</span>
        <ChevronRightIcon
          className={cn("ml-auto size-4 shrink-0 opacity-60 transition-transform duration-200", open && "rotate-90")}
          aria-hidden="true"
        />
      </SidebarMenuButton>
      {open && (
        <SidebarMenuSub id={`subnav-${item.id}`}>
          {item.children.map((child) => (
            <NavSubItem key={child.id} child={child} />
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  )
}

function CollapsibleNavItem({ item }: { item: NavItem & { children: NavChild[] } }) {
  const { state } = useSidebar()
  // Раздел с активной страницей открыт; остальные — как оставил пользователь
  const [open, setOpen] = useState(() => item.children.some((c) => c.isActive) || item.id === "hardware")
  return state === "collapsed" ? (
    <CollapsedNavItem item={item} />
  ) : (
    <ExpandedNavItem item={item} open={open || item.children.some((c) => c.isActive)} onToggle={() => setOpen((p) => !p)} />
  )
}

function LeafNavItem({ item }: { item: NavItem }) {
  if (item.soon || !item.href) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton tooltip={`${item.label} — скоро`} aria-disabled="true" className="pointer-events-none opacity-60">
          {item.icon}
          <span>{item.label}</span>
          <span className="ml-auto group-data-[collapsible=icon]:hidden">
            <SoonBadge />
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }
  return (
    <SidebarMenuItem>
      <SidebarMenuButton tooltip={item.label} isActive={item.isActive} asChild>
        <Link href={item.href}>
          {item.icon}
          <span>{item.label}</span>
          {item.badge !== undefined && (
            <SidebarMenuBadge className="group-data-[collapsible=icon]:hidden">
              <Badge
                variant="secondary"
                className={cn(
                  "h-5 min-w-5 rounded-full px-2 text-[10px] font-medium tabular-nums",
                  item.badgeTone === "warning" && "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                )}
              >
                {item.badge}
              </Badge>
            </SidebarMenuBadge>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function NavMain() {
  const groups = useNavGroups()
  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.id}>
          {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.25">
              {group.items.map((item) =>
                item.children ? (
                  <CollapsibleNavItem key={item.id} item={item as NavItem & { children: NavChild[] }} />
                ) : (
                  <LeafNavItem key={item.id} item={item} />
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}
