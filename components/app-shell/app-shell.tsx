"use client"
// Основа — ReUI block app-shell-12 (reui.io, лицензия команды). Адаптировано под проект.
// Оболочка: сворачиваемый в иконки сайдбар, шапка с хлебными крошками, поиском и
// инструментами текущей страницы, область содержимого.

import { type CSSProperties, type ReactNode } from "react"

import { cn } from "@/lib/utils"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useInventoryBackgroundSync } from "@/hooks/useInventorySync"

import { AppSidebar } from "./app-sidebar"
import { SiteHeader } from "./site-header"

function InventoryBackground() {
  useInventoryBackgroundSync()
  return null
}

export function AppShell({ children, defaultOpen = true }: { children: ReactNode; defaultOpen?: boolean }) {
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider
        defaultOpen={defaultOpen}
        className={cn(
          "[--sidebar:color-mix(in_oklab,var(--color-sidebar)_60%,transparent)]",
          "[--sidebar-border:transparent]",
          "[--sidebar-accent:color-mix(in_oklab,var(--color-primary)_5%,transparent)]",
          "[--sidebar-accent-foreground:var(--color-primary)]"
        )}
        style={{ "--sidebar-width": "248px" } as CSSProperties}
      >
        <InventoryBackground />
        <AppSidebar />
        <SidebarInset className="min-h-svh min-w-0">
          <SiteHeader />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
