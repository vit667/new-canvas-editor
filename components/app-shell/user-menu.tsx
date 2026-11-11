"use client"
// Основа — ReUI block app-shell-12 (reui.io, лицензия команды). Адаптировано: меню внизу сайдбара.

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ChevronsUpDown, MonitorIcon, MoonIcon, SunIcon, Workflow } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

import { USER } from "./data"

const THEMES = [
  { value: "light", label: "Светлая", icon: <SunIcon className="size-3.5" aria-hidden="true" /> },
  { value: "dark", label: "Тёмная", icon: <MoonIcon className="size-3.5" aria-hidden="true" /> },
  { value: "system", label: "Как в системе", icon: <MonitorIcon className="size-3.5" aria-hidden="true" /> },
]

function ThemeSegmentedToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const current = mounted ? (theme ?? "system") : "system"

  return (
    <div role="radiogroup" aria-label="Тема" className="bg-muted/60 inline-flex items-center gap-0.5 rounded-full p-0.5">
      {THEMES.map(({ value, label, icon }) => (
        <Button
          key={value}
          type="button"
          role="radio"
          aria-checked={current === value}
          aria-label={label}
          title={label}
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(value)}
          className={cn(
            "size-6 rounded-full",
            current === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {icon}
        </Button>
      ))}
    </div>
  )
}

export function UserMenu() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" tooltip={USER.name} className="data-[state=open]:bg-sidebar-accent">
              <Avatar className="size-7 rounded-md">
                <AvatarFallback className="rounded-md text-[10px]">{USER.initials}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{USER.name}</span>
                <span className="text-muted-foreground truncate text-xs">{USER.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 opacity-60" aria-hidden="true" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-2 py-2">
                <Avatar className="size-6">
                  <AvatarFallback className="text-[9px]">{USER.initials}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <span className="text-foreground truncate text-sm font-semibold">{USER.name}</span>
                  <span className="text-muted-foreground truncate text-xs">{USER.email}</span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/schemes">
                  <Workflow aria-hidden="true" /> Все схемы
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/issues">
                  <AlertTriangle aria-hidden="true" /> Проблемы реестра
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm">Тема</span>
              <ThemeSegmentedToggle />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
