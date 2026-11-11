"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, CircleCheck, CircleX } from "lucide-react"

import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/app-shell/page-header"
import { useEntities, useInventoryIssues, useRelations } from "@/lib/inventory/hooks"
import { buildLookups } from "@/lib/inventory/views"
import { EntityLink } from "./cells"

const RULE_LABELS: Record<string, string> = {
  "relation-endpoints": "Связь без объекта",
  "contains-cycle": "Цикл вложенности",
  "cable-endpoint": "Кабель без интерфейса",
  "cable-per-interface": "Два кабеля на порту",
  "serial-unique": "Повтор серийного номера",
  "vlan-vid-range": "VID вне диапазона",
  "vlan-vid-unique": "Повтор VID",
  "prefix-cidr": "Некорректный CIDR",
  "ip-syntax": "Некорректный IP",
  "ip-unique": "Повтор IP-адреса",
  "prefix-duplicate": "Дубль подсети в VRF",
  "prefix-host-bits": "Хост-биты в CIDR",
  "prefix-gateway": "Шлюз вне подсети",
  "prefix-dhcp": "DHCP-пул",
  "ip-outside-ipam": "Адрес вне подсетей",
  "ip-network-broadcast": "Адрес сети / broadcast",
  "ip-in-dhcp": "Адрес в DHCP-пуле",
  "cable-compat": "Несовместимые порты",
}

/** Все проблемы реестра, найденные проверками (docs/INVENTORY_MODEL.md §6) */
export function IssuesPage() {
  const issues = useInventoryIssues()
  const entities = useEntities()
  const relations = useRelations()
  const lk = useMemo(() => buildLookups(entities, relations), [entities, relations])
  const [level, setLevel] = useState<"all" | "error" | "warning">("all")

  const list = issues.filter((i) => level === "all" || i.level === level)
  const errors = issues.filter((i) => i.level === "error").length

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <PageHeader
        title="Проблемы"
        description="Нарушения правил реестра: пересечения, дубли, несуществующие ссылки. Ошибки блокируют правку, предупреждения — нет."
      />

      <div className="flex gap-1">
        {(
          [
            ["all", `Все · ${issues.length}`],
            ["error", `Ошибки · ${errors}`],
            ["warning", `Предупреждения · ${issues.length - errors}`],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setLevel(v)}
            className={cn("rounded-md border px-2.5 py-1 text-sm", level === v ? "bg-muted font-medium" : "hover:bg-muted/50")}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-sm">
          <CircleCheck className="size-8 text-emerald-500" />
          Проблем не найдено
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {list.map((i, k) => (
            <div key={k} className="flex items-start gap-3 px-4 py-3">
              {i.level === "error" ? (
                <CircleX className="text-destructive mt-0.5 size-4 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm">{i.message}</div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-xs">
                  {i.entityIds.map((id) => (
                    <EntityLink key={id} id={id} label={lk.label(id)} />
                  ))}
                </div>
              </div>
              <span className="text-muted-foreground shrink-0 text-xs">{RULE_LABELS[i.rule] ?? i.rule}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
