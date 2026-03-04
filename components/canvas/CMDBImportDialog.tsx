import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { parseMarkdownTable, isValidMarkdownTable, getMarkdownTableHeaders } from "@/lib/markdownParser"
import { useCMDBStore } from "@/store/cmdbStore"
import type { CMDBSystem, CMDBComponent, ComponentType } from "@/types/cmdb"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface CMDBImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CMDBImportDialog({ open, onOpenChange }: CMDBImportDialogProps) {
  const [systemsMarkdown, setSystemsMarkdown] = useState("")
  const [componentsMarkdown, setComponentsMarkdown] = useState("")
  const [activeTab, setActiveTab] = useState("systems")
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const { addSystems, addComponents, systems, components } = useCMDBStore()

  const systemsPreview = systemsMarkdown
    ? parseMarkdownTable(systemsMarkdown)
    : []
  const componentsPreview = componentsMarkdown
    ? parseMarkdownTable(componentsMarkdown)
    : []

  const systemsValid = systemsMarkdown
    ? isValidMarkdownTable(systemsMarkdown)
    : true
  const componentsValid = componentsMarkdown
    ? isValidMarkdownTable(componentsMarkdown)
    : true

  const systemsHeaders = systemsMarkdown
    ? getMarkdownTableHeaders(systemsMarkdown)
    : []
  const componentsHeaders = componentsMarkdown
    ? getMarkdownTableHeaders(componentsMarkdown)
    : []

  const handleImportSystems = () => {
    if (!systemsValid || systemsPreview.length === 0) return

    const newSystems: CMDBSystem[] = systemsPreview.map((row, index) => {
      // Try to find id column
      const id =
        row["ID"] ||
        row["id"] ||
        row["Id"] ||
        `sys-${Date.now()}-${index}`

      // Try to find name column
      const name =
        row["Название"] ||
        row["Name"] ||
        row["name"] ||
        row["Имя"] ||
        `System ${index + 1}`

      // Try to find OS column
      const os =
        row["ОС"] ||
        row["OS"] ||
        row["os"] ||
        row["Операционная система"] ||
        ""

      // Try to find component IDs column
      const componentIdsRaw =
        row["Компоненты"] ||
        row["Components"] ||
        row["ComponentIds"] ||
        row["component_ids"] ||
        ""
      const componentIds = componentIdsRaw
        ? componentIdsRaw.split(",").map((id) => id.trim())
        : []

      // Try to find VLAN column
      const vlan =
        row["VLAN"] ||
        row["vlan"] ||
        row["Vlan"] ||
        ""

      // Try to find description column
      const description =
        row["Описание"] ||
        row["Description"] ||
        row["description"] ||
        ""

      // Collect remaining fields as customFields
      const knownKeys = [
        "ID", "id", "Id",
        "Название", "Name", "name", "Имя",
        "ОС", "OS", "os", "Операционная система",
        "Компоненты", "Components", "ComponentIds", "component_ids",
        "VLAN", "vlan", "Vlan",
        "Описание", "Description", "description",
      ]
      const customFields: Record<string, string> = {}
      Object.entries(row).forEach(([key, value]) => {
        if (!knownKeys.includes(key) && value) {
          customFields[key] = value
        }
      })

      return {
        id,
        name,
        os,
        componentIds,
        vlan,
        description,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      }
    })

    // Filter out systems with IDs that already exist
    const existingIds = new Set(systems.map((s) => s.id))
    const uniqueSystems = newSystems.filter((s) => !existingIds.has(s.id))

    if (uniqueSystems.length > 0) {
      addSystems(uniqueSystems)
      setImportResult({
        success: true,
        message: `Импортировано ${uniqueSystems.length} систем${
          newSystems.length !== uniqueSystems.length
            ? ` (${newSystems.length - uniqueSystems.length} пропущено - уже существуют)`
            : ""
        }`,
      })
    } else {
      setImportResult({
        success: false,
        message: "Все системы уже существуют в базе",
      })
    }
  }

  const handleImportComponents = () => {
    if (!componentsValid || componentsPreview.length === 0) return

    const newComponents: CMDBComponent[] = componentsPreview.map((row, index) => {
      // Try to find id column
      const id =
        row["ID"] ||
        row["id"] ||
        row["Id"] ||
        `comp-${Date.now()}-${index}`

      // Try to find name column
      const name =
        row["Название"] ||
        row["Name"] ||
        row["name"] ||
        row["Имя"] ||
        `Component ${index + 1}`

      // Try to find type column
      const typeRaw =
        row["Тип"] ||
        row["Type"] ||
        row["type"] ||
        "other"

      // Map type to ComponentType
      const typeMap: Record<string, ComponentType> = {
        service: "service",
        сервис: "service",
        database: "database",
        "база данных": "database",
        бд: "database",
        queue: "queue",
        очередь: "queue",
        cache: "cache",
        кеш: "cache",
        кэш: "cache",
        other: "other",
        другое: "other",
      }
      const type: ComponentType = typeMap[typeRaw.toLowerCase()] || "other"

      // Try to find description column
      const description =
        row["Описание"] ||
        row["Description"] ||
        row["description"] ||
        ""

      return {
        id,
        name,
        type,
        description,
      }
    })

    // Filter out components with IDs that already exist
    const existingIds = new Set(components.map((c) => c.id))
    const uniqueComponents = newComponents.filter((c) => !existingIds.has(c.id))

    if (uniqueComponents.length > 0) {
      addComponents(uniqueComponents)
      setImportResult({
        success: true,
        message: `Импортировано ${uniqueComponents.length} компонентов${
          newComponents.length !== uniqueComponents.length
            ? ` (${newComponents.length - uniqueComponents.length} пропущено - уже существуют)`
            : ""
        }`,
      })
    } else {
      setImportResult({
        success: false,
        message: "Все компоненты уже существуют в базе",
      })
    }
  }

  const handleClose = () => {
    setSystemsMarkdown("")
    setComponentsMarkdown("")
    setImportResult(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Импорт данных из Markdown</DialogTitle>
          <DialogDescription>
            Вставьте Markdown таблицу для импорта систем или компонентов
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="systems">Системы</TabsTrigger>
            <TabsTrigger value="components">Компоненты</TabsTrigger>
          </TabsList>

          <TabsContent value="systems" className="flex-1 overflow-hidden flex flex-col mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Markdown таблица систем
              </label>
              <textarea
                className="w-full h-32 p-3 text-sm font-mono border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={`| ID | Название | ОС | Компоненты | VLAN | Описание |
|---|---|---|---|---|---|
| sys-001 | Веб-сервер | Linux | comp-001, comp-002 | 100 | Основной веб-сервер |`}
                value={systemsMarkdown}
                onChange={(e) => {
                  setSystemsMarkdown(e.target.value)
                  setImportResult(null)
                }}
              />
              {systemsMarkdown && !systemsValid && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Некорректный формат Markdown таблицы
                </div>
              )}
            </div>

            {systemsPreview.length > 0 && (
              <div className="flex-1 overflow-auto border rounded-md">
                <div className="text-sm font-medium p-2 border-b bg-muted">
                  Предпросмотр ({systemsPreview.length} записей)
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {systemsHeaders.map((header) => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {systemsPreview.slice(0, 5).map((row, idx) => (
                      <TableRow key={idx}>
                        {systemsHeaders.map((header) => (
                          <TableCell key={header} className="text-sm">
                            {row[header] || "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {systemsPreview.length > 5 && (
                      <TableRow>
                        <TableCell
                          colSpan={systemsHeaders.length}
                          className="text-center text-muted-foreground"
                        >
                          ... и ещё {systemsPreview.length - 5} записей
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {importResult && activeTab === "systems" && (
              <div
                className={`flex items-center gap-2 p-3 rounded-md ${
                  importResult.success
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {importResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {importResult.message}
              </div>
            )}
          </TabsContent>

          <TabsContent value="components" className="flex-1 overflow-hidden flex flex-col mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Markdown таблица компонентов
              </label>
              <textarea
                className="w-full h-32 p-3 text-sm font-mono border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={`| ID | Название | Тип | Описание |
|---|---|---|---|
| comp-001 | API Gateway | service | Обработка запросов |
| comp-002 | PostgreSQL | database | Основная БД |`}
                value={componentsMarkdown}
                onChange={(e) => {
                  setComponentsMarkdown(e.target.value)
                  setImportResult(null)
                }}
              />
              {componentsMarkdown && !componentsValid && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Некорректный формат Markdown таблицы
                </div>
              )}
            </div>

            {componentsPreview.length > 0 && (
              <div className="flex-1 overflow-auto border rounded-md">
                <div className="text-sm font-medium p-2 border-b bg-muted">
                  Предпросмотр ({componentsPreview.length} записей)
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {componentsHeaders.map((header) => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {componentsPreview.slice(0, 5).map((row, idx) => (
                      <TableRow key={idx}>
                        {componentsHeaders.map((header) => (
                          <TableCell key={header} className="text-sm">
                            {row[header] || "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {componentsPreview.length > 5 && (
                      <TableRow>
                        <TableCell
                          colSpan={componentsHeaders.length}
                          className="text-center text-muted-foreground"
                        >
                          ... и ещё {componentsPreview.length - 5} записей
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {importResult && activeTab === "components" && (
              <div
                className={`flex items-center gap-2 p-3 rounded-md ${
                  importResult.success
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {importResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {importResult.message}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Закрыть
          </Button>
          {activeTab === "systems" && (
            <Button
              onClick={handleImportSystems}
              disabled={!systemsValid || systemsPreview.length === 0}
            >
              Импортировать системы
            </Button>
          )}
          {activeTab === "components" && (
            <Button
              onClick={handleImportComponents}
              disabled={!componentsValid || componentsPreview.length === 0}
            >
              Импортировать компоненты
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
