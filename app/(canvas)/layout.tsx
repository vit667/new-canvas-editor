import React from "react"
import { cookies } from "next/headers"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { CanvasAppSidebar } from "@/components/canvas/CanvasAppSidebar"
import { SiteHeader } from "@/components/layout/header"

export default async function CanvasLayout({
  children
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const defaultOpen =
    cookieStore.get("sidebar_state")?.value === "true" ||
    cookieStore.get("sidebar_state") === undefined

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 14)",
          "--content-margin": "calc(var(--spacing) * 1.5)",
        } as React.CSSProperties
      }
    >
      <CanvasAppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
