"use client"
// Основа — ReUI block app-shell-12 (reui.io, лицензия команды). Адаптировано под проект.

import Link from "next/link"
import { Network } from "lucide-react"

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

import { BRAND } from "./data"

export function Brand() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild className="gap-2.5">
          <Link href="/schemes" aria-label={`${BRAND.name} — на главную`}>
            <span className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
              <Network className="size-4" aria-hidden="true" />
            </span>
            <div className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate text-sm font-semibold">{BRAND.name}</span>
              <span className="text-muted-foreground truncate text-xs">{BRAND.subtitle}</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
