"use client"
// Основа — ReUI block app-shell-12 (reui.io, лицензия команды). Адаптировано под проект.

import { Fragment, type ReactNode } from "react"
import { MoreHorizontalIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuAction } from "@/components/ui/sidebar"

export type ItemAction = {
  id: string
  label: string
  icon: ReactNode
  destructive?: boolean
  onSelect: () => void
}

export function ItemActionMenu({ label, actions }: { label: string; actions: ItemAction[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuAction showOnHover aria-label={`Действия: ${label}`}>
          <MoreHorizontalIcon aria-hidden="true" />
        </SidebarMenuAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" sideOffset={4} className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{label}</DropdownMenuLabel>
          {actions.map((action) => (
            <Fragment key={action.id}>
              {action.destructive && <DropdownMenuSeparator />}
              <DropdownMenuItem
                variant={action.destructive ? "destructive" : "default"}
                className="[&_svg]:size-3.5 [&_svg]:opacity-60"
                onSelect={action.onSelect}
              >
                {action.icon}
                {action.label}
              </DropdownMenuItem>
            </Fragment>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
