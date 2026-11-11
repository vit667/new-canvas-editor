"use client"

import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Server, Monitor, LayoutPanelTop, Network, EthernetPort, Cpu, Boxes, Table2, ListChecks, User, ShoppingBag, BarChart2, GitBranch, StickyNote, AlertTriangle, Folder } from 'lucide-react'

export type PickableNodeType = 'device' | 'section' | 'networks' | 'switch' | 'specs' | 'service' | 'table' | 'legend' | 'text' | 'person' | 'product-card' | 'stat-card' | 'routing-rule' | 'note' | 'risk' | 'group'

const NODE_TYPE_OPTIONS = [
  {
    type: 'device' as PickableNodeType,
    label: 'Устройство',
    description: 'Карточка: имя, роль, IP, hostname, ОС, VLAN',
    icon: Monitor,
    bg: 'bg-sky-50 hover:bg-sky-100 border-sky-200 dark:bg-sky-950 dark:hover:bg-sky-900 dark:border-sky-800',
    iconBg: 'bg-sky-100 dark:bg-sky-900',
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
  {
    type: 'section' as PickableNodeType,
    label: 'Секция',
    description: 'Контейнер-сервер или зона с меткой VLAN',
    icon: LayoutPanelTop,
    bg: 'bg-slate-50 hover:bg-slate-100 border-slate-300 border-dashed dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-600',
    iconBg: 'bg-slate-200 dark:bg-slate-800',
    iconColor: 'text-slate-700 dark:text-slate-300',
  },
  {
    type: 'networks' as PickableNodeType,
    label: 'Сети (VLAN)',
    description: 'Справочник сетей: цвета для связей и IP',
    icon: Network,
    bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:border-emerald-800',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    type: 'switch' as PickableNodeType,
    label: 'Коммутатор / роутер',
    description: 'Порты-точки подключения с цветом VLAN',
    icon: EthernetPort,
    bg: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:border-indigo-800',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    type: 'service' as PickableNodeType,
    label: 'Сервис / стек',
    description: 'Приложение или стек: иконка, CT/VM, адреса',
    icon: Boxes,
    bg: 'bg-violet-50 hover:bg-violet-100 border-violet-200 dark:bg-violet-950 dark:hover:bg-violet-900 dark:border-violet-800',
    iconBg: 'bg-violet-100 dark:bg-violet-900',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    type: 'specs' as PickableNodeType,
    label: 'Характеристики',
    description: 'Плитки CPU / RAM / диски / сеть',
    icon: Cpu,
    bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 dark:border-amber-800',
    iconBg: 'bg-amber-100 dark:bg-amber-900',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    type: 'table' as PickableNodeType,
    label: 'Таблица',
    description: 'Порты наружу, правила, списки с бейджами',
    icon: Table2,
    bg: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 dark:bg-cyan-950 dark:hover:bg-cyan-900 dark:border-cyan-800',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    type: 'legend' as PickableNodeType,
    label: 'Легенда',
    description: 'Собирается сама из связей на схеме',
    icon: ListChecks,
    bg: 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 dark:bg-zinc-950 dark:hover:bg-zinc-900 dark:border-zinc-800',
    iconBg: 'bg-zinc-100 dark:bg-zinc-900',
    iconColor: 'text-zinc-600 dark:text-zinc-400',
  },
  {
    type: 'text' as PickableNodeType,
    label: 'Система',
    description: 'Сервер, сервис, компонент инфраструктуры',
    icon: Server,
    bg: 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-600',
    iconBg: 'bg-zinc-200 dark:bg-zinc-700',
    iconColor: 'text-zinc-600 dark:text-zinc-300',
  },
  {
    type: 'person' as PickableNodeType,
    label: 'Персона',
    description: 'Пользователь, сотрудник, контакт',
    icon: User,
    bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 dark:border-blue-800',
    iconBg: 'bg-blue-100 dark:bg-blue-900',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    type: 'product-card' as PickableNodeType,
    label: 'Карточка товара',
    description: 'Продукт, товар, SKU с ценой и статусом',
    icon: ShoppingBag,
    bg: 'bg-orange-50 hover:bg-orange-100 border-orange-200 dark:bg-orange-950 dark:hover:bg-orange-900 dark:border-orange-800',
    iconBg: 'bg-orange-100 dark:bg-orange-900',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  {
    type: 'stat-card' as PickableNodeType,
    label: 'Карточка статистики',
    description: 'Метрика, KPI, статистический показатель',
    icon: BarChart2,
    bg: 'bg-green-50 hover:bg-green-100 border-green-200 dark:bg-green-950 dark:hover:bg-green-900 dark:border-green-800',
    iconBg: 'bg-green-100 dark:bg-green-900',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  {
    type: 'routing-rule' as PickableNodeType,
    label: 'Правило маршрутизации',
    description: 'Логика маршрутизации, условия и действия',
    icon: GitBranch,
    bg: 'bg-purple-50 hover:bg-purple-100 border-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 dark:border-purple-800',
    iconBg: 'bg-purple-100 dark:bg-purple-900',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    type: 'note' as PickableNodeType,
    label: 'Заметка',
    description: 'Текстовая заметка, комментарий, документация',
    icon: StickyNote,
    bg: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200 dark:bg-yellow-950 dark:hover:bg-yellow-900 dark:border-yellow-800',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
  },
  {
    type: 'risk' as PickableNodeType,
    label: 'Риск',
    description: 'Риск, угроза, проблема с вероятностью и влиянием',
    icon: AlertTriangle,
    bg: 'bg-red-50 hover:bg-red-100 border-red-200 dark:bg-red-950 dark:hover:bg-red-900 dark:border-red-800',
    iconBg: 'bg-red-100 dark:bg-red-900',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  {
    type: 'group' as PickableNodeType,
    label: 'Группа',
    description: 'Группировка нод, категория, контейнер',
    icon: Folder,
    bg: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:border-indigo-800',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
]

interface NodeTypePickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (type: PickableNodeType) => void
}

export function NodeTypePicker({ isOpen, onClose, onSelect }: NodeTypePickerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Выберите тип узла</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {NODE_TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon
            return (
              <button
                key={opt.type}
                onClick={() => { onSelect(opt.type); onClose(); }}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all cursor-pointer',
                  opt.bg
                )}
              >
                <div className={cn('flex-shrink-0 w-9 h-9 rounded-md flex items-center justify-center', opt.iconBg)}>
                  <Icon className={cn('w-5 h-5', opt.iconColor)} />
                </div>
                <div>
                  <div className="font-medium text-sm text-foreground">{opt.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{opt.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
