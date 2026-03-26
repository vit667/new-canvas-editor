import type { Node, Edge } from "reactflow"
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
import * as LucideIcons from "lucide-react"
import type { ServiceItem } from "@/types/canvas"
import { Network } from "lucide-react"

interface TableViewProps {
  nodes: Node[]
  edges: Edge[]
}

export function TableView({ nodes, edges }: TableViewProps) {
  // Функция для получения компонента иконки по имени
  const getIconComponent = (iconName: string) => {
    if (!iconName) return null

    // Пробуем разные варианты капитализации
    const variants = [
      iconName,
      iconName.charAt(0).toUpperCase() + iconName.slice(1),
      iconName.toLowerCase(),
      iconName.toUpperCase(),
    ]

    for (const variant of variants) {
      const IconComponent = (LucideIcons as any)[variant]
      if (IconComponent) {
        return IconComponent
      }
    }

    console.log('Icon not found:', iconName, 'Available icons:', Object.keys(LucideIcons).slice(0, 10))
    return null
  }

  // Создаем карту соединений для каждого узла
  const getNodeConnections = (nodeId: string) => {
    const incoming = edges
      .filter((edge) => edge.target === nodeId)
      .map((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source)
        return sourceNode?.data?.label || edge.source
      })

    const outgoing = edges
      .filter((edge) => edge.source === nodeId)
      .map((edge) => {
        const targetNode = nodes.find((n) => n.id === edge.target)
        return targetNode?.data?.label || edge.target
      })

    return { incoming, outgoing }
  }

  // Получаем все уникальные customFields из всех узлов
  // Собираем уникальные заголовки (по полю key из объекта customField)
  const uniqueFieldKeys = new Set<string>()

  nodes.forEach((node) => {
    if (node.data?.customFields) {
      Object.values(node.data.customFields).forEach((fieldValue) => {
        if (typeof fieldValue === 'object' && fieldValue && 'key' in fieldValue && typeof fieldValue.key === 'string') {
          uniqueFieldKeys.add(fieldValue.key)
        }
      })
    }
  })

  const allCustomFields = Array.from(uniqueFieldKeys)

  return (
    <TooltipProvider delayDuration={500}>
      <div className="p-4">
        <Table className="w-max min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Группа</TableHead>
            <TableHead>Сервисы</TableHead>
            <TableHead>Входящие связи</TableHead>
            <TableHead>Исходящие связи</TableHead>
            {allCustomFields.map((fieldKey) => (
              <TableHead key={fieldKey}>{fieldKey}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {nodes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6 + allCustomFields.length} className="text-center text-muted-foreground">
                Нет узлов для отображения
              </TableCell>
            </TableRow>
          ) : (
            nodes.map((node) => {
              const { incoming, outgoing } = getNodeConnections(node.id)

              // Находим родительскую группу
              const parentGroup = node.parentId
                ? nodes.find(n => n.id === node.parentId)?.data?.label
                : null

              // Получаем иконку узла (если есть)
              const nodeIcon = node.data?.icon
              const NodeIconComponent = nodeIcon ? getIconComponent(nodeIcon) : null

              // Получаем сервисы узла
              const services = (node.data?.services as ServiceItem[]) || []

              // Для tracked узлов
              const isTracked = node.type === 'tracked'
              const isTrackedGroup = node.type === 'tracked-group'
              // Определяем тип узла
              const nodeTypeLabel = node.type === 'tracked' 
                ? 'Отслеживаемый' 
                : node.type === 'tracked-group'
                ? 'Отслеживаемая группа'
                : node.type === 'group' 
                ? 'Группа' 
                : 'Узел'

              return (
                <TableRow key={node.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {NodeIconComponent && <NodeIconComponent className="w-4 h-4" />}
                      <span>{node.data?.label || 'Без названия'}</span>
                      {(isTracked || isTrackedGroup) && (
                        <div title={isTrackedGroup ? "Отслеживаемая группа" : "Отслеживаемый узел"}>
                          <Network className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {nodeTypeLabel}
                  </TableCell>
                  <TableCell className="text-sm">
                    {parentGroup || '-'}
                  </TableCell>
                  <TableCell>
                    {services.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {services.map((service) => {
                          const ServiceIconComponent = service.icon ? getIconComponent(service.icon) : null
                          const serviceLabel = service.port 
                            ? `${service.name}:${service.port}` 
                            : service.name
                          
                          // Формируем содержимое tooltip
                          const tooltipContent = (
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
                                        <span className="font-medium">{field.key}:</span>{' '}
                                        <span>{field.value || '-'}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {!service.startCommand && (!service.customFields || service.customFields.length === 0) && (
                                <div className="text-xs text-gray-400">Нет дополнительной информации</div>
                              )}
                            </div>
                          )

                          return (
                            <Tooltip key={service.id}>
                              <TooltipTrigger asChild>
                                <div className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded cursor-help">
                                  {ServiceIconComponent && <ServiceIconComponent className="w-3 h-3" />}
                                  <span>{serviceLabel}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs p-3 bg-gray-900 text-white border border-gray-700 shadow-lg">
                                {tooltipContent}
                              </TooltipContent>
                            </Tooltip>
                          )
                        })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {incoming.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {incoming.map((label, idx) => (
                          <span key={idx} className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {outgoing.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {outgoing.map((label, idx) => (
                          <span key={idx} className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  {allCustomFields.map((fieldKey) => {
                    // Ищем customField с соответствующим key
                    let displayValue = '-'
                    let iconName = null

                    if (node.data?.customFields) {
                      const customField = Object.values(node.data.customFields).find(
                        (cf: any) => typeof cf === 'object' && cf?.key === fieldKey
                      )

                      if (customField && typeof customField === 'object' && 'value' in customField && 'icon' in customField) {
                        displayValue = (customField.value as string) || '-'
                        iconName = customField.icon as string | null

                        // Debug: показываем структуру customField
                        if (customField.icon) {
                          console.log('CustomField:', customField)
                        }
                      }
                    }

                    const IconComponent = iconName ? getIconComponent(iconName) : null

                    return (
                      <TableCell key={fieldKey} className="text-sm">
                        <div className="flex items-center gap-2">
                          {IconComponent && <IconComponent className="w-4 h-4" />}
                          <span>{displayValue}</span>
                        </div>
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
      </div>
    </TooltipProvider>
  )
}
