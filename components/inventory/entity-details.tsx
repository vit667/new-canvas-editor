"use client"

import Link from "next/link"
import { ArrowRight, MapPin, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import AppIcon from "@/components/canvas/AppIcon"
import { KIND_LABELS, RELATION_LABELS, type Entity } from "@/lib/inventory/types"
import type { InventoryLookups } from "@/lib/inventory/views"
import { schemeHref } from "@/lib/navigation"
import { EditableText, EntityLink, updateEntity } from "./cells"

const ATTR_LABELS: Record<string, string> = {
  role: "Роль", model: "Модель", platform: "ОС / прошивка", hostname: "Hostname", serial: "Серийный №", vendor: "Производитель",
  vlanId: "VLAN", icon: "Иконка", deviceId: "Устройство", type: "Тип", speed: "Скорость", mode: "Режим",
  untaggedVlanId: "VLAN (untagged)", enabled: "Включён", order: "Порядок", address: "Адрес", dnsName: "DNS-имя",
  assignedToId: "Назначен", cidr: "CIDR", gateway: "Шлюз", vid: "VID", color: "Цвет", tag: "Метка", url: "Адрес",
  ref: "CT / VM", subtitle: "Описание", note: "Назначение", product: "Продукт", version: "Версия", provider: "Провайдер",
  aInterfaceId: "Сторона A", bInterfaceId: "Сторона B", label: "Подпись", bandwidth: "Канал", lanOnly: "Только LAN",
}

/** Карточка объекта справа от таблицы: поля, связи, где нарисован */
export function EntityDetails({
  entity,
  lk,
  places,
  schemeNames,
  onClose,
}: {
  entity: Entity
  lk: InventoryLookups
  places: { projectId: string; nodeId: string }[]
  schemeNames: Map<string, string>
  onClose: () => void
}) {
  const rels = lk.relationsOf(entity.id)
  const ips = lk.ipsOf(entity.id)
  const icon = ("icon" in entity.attrs && (entity.attrs as { icon?: string }).icon) || "box"

  return (
    <aside className="bg-background flex w-[340px] shrink-0 flex-col overflow-y-auto border-l">
      <div className="flex items-start gap-2.5 border-b p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md border">
          <AppIcon value={icon} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <EditableText value={entity.name} onSave={(v) => !!v && updateEntity(entity, { name: v })} className="block font-semibold" />
          <div className="text-muted-foreground text-xs">{KIND_LABELS[entity.kind]}</div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Закрыть">
          <X className="size-4" />
        </Button>
      </div>

      <section className="border-b p-4">
        <div className="mb-1.5 text-xs font-medium">Описание</div>
        <EditableText
          value={entity.description}
          placeholder="Добавить описание…"
          onSave={(v) => updateEntity(entity, { description: v })}
          className="text-sm"
        />
      </section>

      <section className="border-b p-4">
        <div className="mb-1.5 text-xs font-medium">Поля</div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
          {Object.entries(entity.attrs).map(([k, v]) => {
            if (k === "icon" || k === "order") return null
            const ref = typeof v === "string" ? lk.byId.get(v) : undefined
            const textValue = typeof v === "object" ? JSON.stringify(v) : String(v)
            return (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{ATTR_LABELS[k] ?? k}</dt>
                <dd className="min-w-0 truncate font-mono">
                  {ref ? <EntityLink id={ref.id} label={lk.label(ref.id)} /> : textValue}
                </dd>
              </div>
            )
          })}
          {ips.map((ip) => (
            <div key={ip.id} className="contents">
              <dt className="text-muted-foreground">IP</dt>
              <dd className="font-mono">
                <EntityLink id={ip.id} label={ip.attrs.address ?? ip.name} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-b p-4">
        <div className="mb-1.5 text-xs font-medium">Связи · {rels.length}</div>
        <div className="space-y-1">
          {rels.map(({ rel, via }) => {
            const outgoing = rel.fromId === via
            const other = outgoing ? rel.toId : rel.fromId
            const port = via !== entity.id ? lk.byId.get(via)?.name : undefined
            return (
              <div key={`${rel.id}|${via}`} className="flex min-w-0 items-center gap-1.5 text-xs">
                {port && <span className="bg-muted shrink-0 rounded px-1 font-mono text-[10px]">{port}</span>}
                <span className="text-muted-foreground shrink-0">{outgoing ? RELATION_LABELS[rel.type] : `← ${RELATION_LABELS[rel.type]}`}</span>
                <ArrowRight className="text-muted-foreground size-3 shrink-0" />
                <EntityLink id={other} label={lk.label(other)} />
                {typeof rel.props?.kind === "string" && <span className="text-muted-foreground ml-auto font-mono text-[10px]">{rel.props.kind}</span>}
              </div>
            )
          })}
          {rels.length === 0 && <div className="text-muted-foreground text-xs">Нет связей</div>}
        </div>
      </section>

      <section className="p-4">
        <div className="mb-1.5 text-xs font-medium">На схемах</div>
        <div className="space-y-1">
          {places.map((p) => (
            <Link
              key={`${p.projectId}|${p.nodeId}`}
              href={`${schemeHref(p.projectId)}?node=${encodeURIComponent(p.nodeId)}`}
              className="hover:bg-muted flex items-center gap-1.5 rounded px-1.5 py-1 text-xs"
            >
              <MapPin className="size-3.5" /> {schemeNames.get(p.projectId) ?? p.projectId}
            </Link>
          ))}
          {places.length === 0 && <div className="text-muted-foreground text-xs">Ни на одной схеме</div>}
        </div>
      </section>
    </aside>
  )
}
