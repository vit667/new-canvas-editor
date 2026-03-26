"use client"

import { useState, useMemo } from "react"
import type { Node, Edge } from "reactflow"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type VisibilityState,
  type RowSelectionState,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import * as LucideIcons from "lucide-react"
import type { ServiceItem } from "@/types/canvas"
import { Network, SlidersHorizontal, ChevronDown } from "lucide-react"

interface TableViewProps {
  nodes: Node[]
  edges: Edge[]
}

type RowData = {
  id: string
  node: Node
  label: string
  typeLabel: string
  parentGroup: string
  services: ServiceItem[]
  incoming: string[]
  outgoing: string[]
  isTracked: boolean
  isTrackedGroup: boolean
  customFields: Record<string, { value: string; icon: string | null }>
}

function getIconComponent(iconName: string) {
  if (!iconName) return null
  const variants = [
    iconName,
    iconName.charAt(0).toUpperCase() + iconName.slice(1),
    iconName.toLowerCase(),
    iconName.toUpperCase(),
  ]
  for (const variant of variants) {
    const Icon = (LucideIcons as Record<string, unknown>)[variant]
    if (Icon) return Icon as React.ElementType
  }
  return null
}

function ServiceCell({ services }: { services: ServiceItem[] }) {
  if (services.length === 0) return <span className="text-muted-foreground text-sm">-</span>
  return (
    <div className="flex flex-wrap gap-1">
      {services.map((service) => {
        const ServiceIconComponent = service.icon ? getIconComponent(service.icon) : null
        const serviceLabel = service.port ? `${service.name}:${service.port}` : service.name
        return (
          <Tooltip key={service.id}>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded cursor-help">
                {ServiceIconComponent && <ServiceIconComponent className="w-3 h-3" />}
                <span>{serviceLabel}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs p-3 bg-gray-900 text-white border border-gray-700 shadow-lg">
              <div className="space-y-2 max-w-xs">
                {service.startCommand && (
                  <div>
                    <div className="font-semibold text-xs mb-1 text-white">Как запускать:</div>
                    <div className="text-xs font-mono bg-black/30 px-2 py-1 rounded text-gray-200">
                      {service.startCommand}
                    </div>
                  </div>
                )}
                {service.customFields && service.customFields.length > 0 && (
                  <div>
                    <div className="font-semibold text-xs mb-1 text-white">Дополнительные поля:</div>
                    <div className="space-y-1">
                      {service.customFields.map((field) => (
                        <div key={field.id} className="text-xs text-gray-200">
                          <span className="font-medium">{field.key}:</span>{" "}
                          <span>{field.value || "-"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!service.startCommand && (!service.customFields || service.customFields.length === 0) && (
                  <div className="text-xs text-gray-400">Нет дополнительной информации</div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

function BadgeList({ items, color }: { items: string[]; color: string }) {
  if (items.length === 0) return <span className="text-muted-foreground text-sm">-</span>
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((label, idx) => (
        <span key={idx} className={`inline-block px-2 py-1 text-xs ${color} rounded`}>
          {label}
        </span>
      ))}
    </div>
  )
}

export function TableView({ nodes, edges }: TableViewProps) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [groupFilter, setGroupFilter] = useState<string>("__all__")

  const allRows = useMemo<RowData[]>(() => {
    return nodes.map((node) => {
      const incoming = edges
        .filter((e) => e.target === node.id)
        .map((e) => nodes.find((n) => n.id === e.source)?.data?.label || e.source)
      const outgoing = edges
        .filter((e) => e.source === node.id)
        .map((e) => nodes.find((n) => n.id === e.target)?.data?.label || e.target)
      const parentGroup = node.parentId
        ? nodes.find((n) => n.id === node.parentId)?.data?.label || ""
        : ""
      const typeLabel =
        node.type === "tracked"
          ? "Отслеживаемый"
          : node.type === "tracked-group"
          ? "Отслеживаемая группа"
          : node.type === "group"
          ? "Группа"
          : "Узел"

      const customFields: Record<string, { value: string; icon: string | null }> = {}
      if (node.data?.customFields) {
        Object.values(node.data.customFields).forEach((cf: unknown) => {
          if (cf && typeof cf === "object" && "key" in cf && typeof (cf as { key: unknown }).key === "string") {
            const field = cf as { key: string; value?: string; icon?: string }
            customFields[field.key] = { value: field.value || "", icon: field.icon || null }
          }
        })
      }

      return {
        id: node.id,
        node,
        label: node.data?.label || "Без названия",
        typeLabel,
        parentGroup,
        services: (node.data?.services as ServiceItem[]) || [],
        incoming,
        outgoing,
        isTracked: node.type === "tracked",
        isTrackedGroup: node.type === "tracked-group",
        customFields,
      }
    })
  }, [nodes, edges])

  const allGroups = useMemo(() => {
    const groups = new Set<string>()
    allRows.forEach((r) => { if (r.parentGroup) groups.add(r.parentGroup) })
    return Array.from(groups).sort()
  }, [allRows])

  const allCustomFieldKeys = useMemo(() => {
    const keys = new Set<string>()
    allRows.forEach((r) => Object.keys(r.customFields).forEach((k) => keys.add(k)))
    return Array.from(keys)
  }, [allRows])

  const filteredRows = useMemo(() => {
    if (groupFilter === "__all__") return allRows
    return allRows.filter((r) => r.parentGroup === groupFilter)
  }, [allRows, groupFilter])

  const columns = useMemo<ColumnDef<RowData>[]>(() => {
    const staticCols: ColumnDef<RowData>[] = [
      {
        id: "select",
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Выбрать все"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Выбрать строку"
          />
        ),
      },
      {
        id: "label",
        header: "Название",
        accessorKey: "label",
        cell: ({ row }) => {
          const { node, isTracked, isTrackedGroup, label } = row.original
          const NodeIconComponent = node.data?.icon ? getIconComponent(node.data.icon) : null
          return (
            <div className="flex items-center gap-2 font-medium">
              {NodeIconComponent && <NodeIconComponent className="w-4 h-4" />}
              <span>{label}</span>
              {(isTracked || isTrackedGroup) && (
                <div title={isTrackedGroup ? "Отслеживаемая группа" : "Отслеживаемый узел"}>
                  <Network className="w-3.5 h-3.5 text-blue-600" />
                </div>
              )}
            </div>
          )
        },
      },
      {
        id: "typeLabel",
        header: "Тип",
        accessorKey: "typeLabel",
        cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
      },
      {
        id: "parentGroup",
        header: "Группа",
        accessorKey: "parentGroup",
        cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) || "-"}</span>,
      },
      {
        id: "services",
        header: "Сервисы",
        cell: ({ row }) => <ServiceCell services={row.original.services} />,
      },
      {
        id: "incoming",
        header: "Входящие связи",
        cell: ({ row }) => (
          <BadgeList items={row.original.incoming} color="bg-blue-100 text-blue-800" />
        ),
      },
      {
        id: "outgoing",
        header: "Исходящие связи",
        cell: ({ row }) => (
          <BadgeList items={row.original.outgoing} color="bg-green-100 text-green-800" />
        ),
      },
    ]

    const customCols: ColumnDef<RowData>[] = allCustomFieldKeys.map((key) => ({
      id: `custom_${key}`,
      header: key,
      cell: ({ row }) => {
        const field = row.original.customFields[key]
        if (!field) return <span className="text-muted-foreground text-sm">-</span>
        const IconComponent = field.icon ? getIconComponent(field.icon) : null
        return (
          <div className="flex items-center gap-2 text-sm">
            {IconComponent && <IconComponent className="w-4 h-4" />}
            <span>{field.value || "-"}</span>
          </div>
        )
      },
    }))

    return [...staticCols, ...customCols]
  }, [allCustomFieldKeys])

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { columnVisibility, rowSelection },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
    getRowId: (row) => row.id,
  })

  const selectedCount = Object.keys(rowSelection).length

  return (
    <TooltipProvider delayDuration={500}>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                {groupFilter === "__all__" ? "Все группы" : groupFilter}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Фильтр по группе</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={groupFilter === "__all__"}
                onCheckedChange={() => setGroupFilter("__all__")}
              >
                Все группы
              </DropdownMenuCheckboxItem>
              {allGroups.map((g) => (
                <DropdownMenuCheckboxItem
                  key={g}
                  checked={groupFilter === g}
                  onCheckedChange={() => setGroupFilter(g)}
                >
                  {g}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {selectedCount > 0 && (
            <span className="text-xs text-muted-foreground">
              Выбрано: {selectedCount}
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 ml-auto">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Столбцы
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Видимые столбцы</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllLeafColumns()
                .filter((col) => col.getCanHide())
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(!!v)}
                  >
                    {col.columnDef.header as string}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Table className="w-max min-w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground"
                >
                  Нет узлов для отображения
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}
