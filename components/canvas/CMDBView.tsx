import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  useCMDBStore,
  useFilteredSystems,
  useUniqueOSValues,
  useUniqueVLANValues,
  useComponentTypes,
} from "@/store/cmdbStore"
import type { SortField, ComponentType } from "@/types/cmdb"
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Upload,
  Trash2,
  Database,
  Server,
  MessageSquare,
  HardDrive,
  Package,
} from "lucide-react"
import { CMDBImportDialog } from "./CMDBImportDialog"

const componentTypeLabels: Record<ComponentType, string> = {
  service: "Сервис",
  database: "База данных",
  queue: "Очередь",
  cache: "Кеш",
  other: "Другое",
}

const componentTypeColors: Record<ComponentType, string> = {
  service: "bg-blue-100 text-blue-800",
  database: "bg-green-100 text-green-800",
  queue: "bg-orange-100 text-orange-800",
  cache: "bg-purple-100 text-purple-800",
  other: "bg-gray-100 text-gray-800",
}

const componentTypeIcons: Record<ComponentType, React.ComponentType<{ className?: string }>> = {
  service: Server,
  database: Database,
  queue: MessageSquare,
  cache: HardDrive,
  other: Package,
}

export function CMDBView() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [importOpen, setImportOpen] = useState(false)

  const { filters, setFilters, sort, setSort, components, deleteSystem } = useCMDBStore()
  const filteredSystems = useFilteredSystems()
  const uniqueOS = useUniqueOSValues()
  const uniqueVLAN = useUniqueVLANValues()
  const componentTypes = useComponentTypes()

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSort = (field: SortField) => {
    if (sort.field === field) {
      setSort({
        field,
        direction: sort.direction === "asc" ? "desc" : "asc",
      })
    } else {
      setSort({ field, direction: "asc" })
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sort.field !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    return sort.direction === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    )
  }

  const toggleOSFilter = (os: string) => {
    const newOS = filters.os.includes(os)
      ? filters.os.filter((o) => o !== os)
      : [...filters.os, os]
    setFilters({ os: newOS })
  }

  const toggleVLANFilter = (vlan: string) => {
    const newVLAN = filters.vlan.includes(vlan)
      ? filters.vlan.filter((v) => v !== vlan)
      : [...filters.vlan, vlan]
    setFilters({ vlan: newVLAN })
  }

  const toggleComponentTypeFilter = (type: ComponentType) => {
    const newTypes = filters.componentType.includes(type)
      ? filters.componentType.filter((t) => t !== type)
      : [...filters.componentType, type]
    setFilters({ componentType: newTypes })
  }

  const getSystemComponents = (componentIds: string[]) => {
    return components.filter((c) => componentIds.includes(c.id))
  }

  const hasActiveFilters =
    filters.os.length > 0 ||
    filters.vlan.length > 0 ||
    filters.componentType.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Filters Bar */}
      <div className="flex items-center gap-4 p-4 border-b bg-muted/30">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="pl-9"
          />
        </div>

        {/* OS Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              ОС {filters.os.length > 0 && `(${filters.os.length})`}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Операционная система</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {uniqueOS.length > 0 ? (
              uniqueOS.map((os) => (
                <DropdownMenuCheckboxItem
                  key={os}
                  checked={filters.os.includes(os)}
                  onCheckedChange={() => toggleOSFilter(os)}
                >
                  {os}
                </DropdownMenuCheckboxItem>
              ))
            ) : (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                Нет данных
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* VLAN Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              VLAN {filters.vlan.length > 0 && `(${filters.vlan.length})`}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>VLAN</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {uniqueVLAN.length > 0 ? (
              uniqueVLAN.map((vlan) => (
                <DropdownMenuCheckboxItem
                  key={vlan}
                  checked={filters.vlan.includes(vlan)}
                  onCheckedChange={() => toggleVLANFilter(vlan)}
                >
                  {vlan}
                </DropdownMenuCheckboxItem>
              ))
            ) : (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                Нет данных
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Component Type Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Тип компонента{" "}
              {filters.componentType.length > 0 &&
                `(${filters.componentType.length})`}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Тип компонента</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {componentTypes.map((type) => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={filters.componentType.includes(type)}
                onCheckedChange={() => toggleComponentTypeFilter(type)}
              >
                {componentTypeLabels[type]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setFilters({ os: [], vlan: [], componentType: [] })
            }
          >
            Сбросить фильтры
          </Button>
        )}

        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Импорт
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center">
                  Название
                  {getSortIcon("name")}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("os")}
              >
                <div className="flex items-center">
                  ОС
                  {getSortIcon("os")}
                </div>
              </TableHead>
              <TableHead>Компоненты</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("vlan")}
              >
                <div className="flex items-center">
                  VLAN
                  {getSortIcon("vlan")}
                </div>
              </TableHead>
              <TableHead>Описание</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSystems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  {filters.search || hasActiveFilters
                    ? "Нет систем, соответствующих фильтрам"
                    : "Нет данных. Импортируйте системы из Markdown."}
                </TableCell>
              </TableRow>
            ) : (
              filteredSystems.map((system) => {
                const isExpanded = expandedRows.has(system.id)
                const systemComponents = getSystemComponents(system.componentIds)

                return (
                  <>
                    <TableRow key={system.id} className="group">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleExpand(system.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{system.name}</TableCell>
                      <TableCell>{system.os}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {systemComponents.map((comp) => {
                            const IconComponent = componentTypeIcons[comp.type]
                            return (
                              <span
                                key={comp.id}
                                className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${componentTypeColors[comp.type]}`}
                                title={comp.description}
                              >
                                <IconComponent className="h-3 w-3" />
                                {comp.name}
                              </span>
                            )
                          })}
                          {systemComponents.length === 0 && (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{system.vlan || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {system.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          onClick={() => deleteSystem(system.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Row */}
                    {isExpanded && (
                      <TableRow key={`${system.id}-expanded`}>
                        <TableCell colSpan={7} className="bg-muted/30">
                          <div className="p-4 space-y-4">
                            {/* Components Details */}
                            {systemComponents.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold mb-2">
                                  Компоненты ({systemComponents.length})
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {systemComponents.map((comp) => {
                                    const IconComponent =
                                      componentTypeIcons[comp.type]
                                    return (
                                      <div
                                        key={comp.id}
                                        className="flex items-start gap-3 p-3 bg-background rounded-md border"
                                      >
                                        <div
                                          className={`p-2 rounded ${componentTypeColors[comp.type]}`}
                                        >
                                          <IconComponent className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-sm">
                                            {comp.name}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {componentTypeLabels[comp.type]}
                                          </div>
                                          {comp.description && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                              {comp.description}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Custom Fields */}
                            {system.customFields &&
                              Object.keys(system.customFields).length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">
                                    Дополнительные поля
                                  </h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {Object.entries(system.customFields).map(
                                      ([key, value]) => (
                                        <div
                                          key={key}
                                          className="p-2 bg-background rounded-md border"
                                        >
                                          <div className="text-xs text-muted-foreground">
                                            {key}
                                          </div>
                                          <div className="text-sm font-medium">
                                            {value || "-"}
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Import Dialog */}
      <CMDBImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
