"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { RELATION_LABELS, type Entity } from "@/lib/inventory/types"
import type { InventoryLookups } from "@/lib/inventory/views"
import { EditableText, EntityLink, NameCell, SchemesCell, StatusPill, VlanBadge, updateEntity } from "./cells"

/** Строка таблицы реестра: объект или связь со схемы (раздел «Кабели и связи») */
export interface InventoryRow {
  id: string
  entity?: Entity
  link?: { a?: string; b?: string; kind: string; speed?: string; vlanId?: string; label?: string; relationType?: string }
  places: { projectId: string; nodeId: string }[]
  issues: number
  /** Текст для поиска */
  search: string
  /** Значения для сортировки по колонкам */
  sort: Record<string, string | number>
}

export interface ColumnCtx {
  lk: InventoryLookups
  schemeNames: Map<string, string>
  icon: (e: Entity) => string
}

type Col = ColumnDef<InventoryRow>

const text = (id: string, header: string, get: (e: Entity) => string | undefined, opts?: { mono?: boolean; attr?: string; size?: number }): Col => ({
  id,
  header,
  size: opts?.size,
  accessorFn: (r) => (r.entity ? get(r.entity) ?? "" : ""),
  cell: ({ row }) => {
    const e = row.original.entity
    if (!e) return null
    const v = get(e)
    return opts?.attr ? (
      <EditableText value={v} mono={opts.mono} onSave={(nv) => updateEntity(e, { attrs: { [opts.attr!]: nv } })} />
    ) : (
      <span className={opts?.mono ? "font-mono text-[13px]" : undefined}>{v || <span className="text-muted-foreground">—</span>}</span>
    )
  },
})

const nameCol = (ctx: ColumnCtx, header = "Имя"): Col => ({
  id: "name",
  header,
  size: 260,
  accessorFn: (r) => r.entity?.name ?? "",
  cell: ({ row }) => (row.original.entity ? <NameCell entity={row.original.entity} issues={row.original.issues} icon={ctx.icon(row.original.entity)} /> : null),
})

const schemesCol = (ctx: ColumnCtx): Col => ({
  id: "schemes",
  header: "На схемах",
  size: 180,
  accessorFn: (r) => r.places.length,
  cell: ({ row }) => <SchemesCell places={row.original.places} names={ctx.schemeNames} />,
})

const vlanCol = (ctx: ColumnCtx, get: (e: Entity) => string | undefined, header = "VLAN"): Col => ({
  id: "vlan",
  header,
  accessorFn: (r) => (r.entity ? ctx.lk.label(get(r.entity)) : ""),
  cell: ({ row }) => (row.original.entity ? <VlanBadge vlan={ctx.lk.byId.get(get(row.original.entity) ?? "")} /> : null),
})

const ipCol = (ctx: ColumnCtx): Col => ({
  id: "ip",
  header: "IP",
  accessorFn: (r) => (r.entity ? ctx.lk.ipsOf(r.entity.id)[0]?.attrs.address ?? "" : ""),
  cell: ({ row }) => {
    const e = row.original.entity
    if (!e) return null
    const ips = ctx.lk.ipsOf(e.id)
    if (!ips.length) return <span className="text-muted-foreground">—</span>
    return (
      <div className="flex flex-col">
        {ips.map((ip) => (
          <EditableText
            key={ip.id}
            value={ip.attrs.address}
            mono
            onSave={(v) => updateEntity(ip, { name: v, attrs: { address: v } })}
          />
        ))}
      </div>
    )
  },
})

/** Колонки для каждого раздела реестра */
export function columnsFor(slug: string, ctx: ColumnCtx): Col[] {
  const { lk } = ctx
  switch (slug) {
    case "devices":
      return [
        nameCol(ctx),
        text("role", "Роль", (e) => (e.kind === "device" ? e.attrs.role : undefined), { attr: "role" }),
        text("model", "Модель", (e) => (e.kind === "device" ? e.attrs.model : undefined), { attr: "model" }),
        text("platform", "ОС / прошивка", (e) => (e.kind === "device" ? e.attrs.platform : undefined), { attr: "platform" }),
        ipCol(ctx),
        text("hostname", "Hostname", (e) => (e.kind === "device" ? e.attrs.hostname : undefined), { attr: "hostname", mono: true }),
        vlanCol(ctx, (e) => (e.kind === "device" ? e.attrs.vlanId : undefined), "Сеть упр."),
        {
          id: "ports",
          header: "Порты",
          accessorFn: (r) => (r.entity ? lk.portsOf(r.entity.id).length : 0),
          cell: ({ row }) => {
            const e = row.original.entity
            if (!e) return null
            const ports = lk.portsOf(e.id)
            if (!ports.length) return <span className="text-muted-foreground">—</span>
            const busy = ports.filter((p) => lk.peerOf(p.id)).length
            const off = ports.filter((p) => p.attrs.enabled === false).length
            return (
              <span className="text-xs tabular-nums" title={`занято ${busy}, свободно ${ports.length - busy - off}, выключено ${off}`}>
                <span className="font-medium">{busy}</span>
                <span className="text-muted-foreground">/{ports.length} занято</span>
              </span>
            )
          },
        },
        text("serial", "Серийный №", (e) => (e.kind === "device" ? e.attrs.serial : undefined), { attr: "serial", mono: true }),
        schemesCol(ctx),
      ]

    case "ports":
      return [
        {
          id: "device",
          header: "Устройство",
          size: 180,
          accessorFn: (r) => (r.entity?.kind === "interface" ? lk.label(r.entity.attrs.deviceId) : ""),
          cell: ({ row }) => {
            const e = row.original.entity
            return e?.kind === "interface" ? <EntityLink id={e.attrs.deviceId} label={lk.label(e.attrs.deviceId)} /> : null
          },
        },
        nameCol(ctx, "Порт"),
        text("type", "Тип", (e) => (e.kind === "interface" ? e.attrs.type : undefined), { mono: true }),
        text("speed", "Скорость", (e) => (e.kind === "interface" ? e.attrs.speed : undefined), { mono: true }),
        text("mode", "Режим", (e) => (e.kind === "interface" ? (e.attrs.mode === "trunk" ? "trunk" : e.attrs.mode === "access" ? "access" : e.attrs.mode) : undefined)),
        vlanCol(ctx, (e) => (e.kind === "interface" ? e.attrs.untaggedVlanId : undefined)),
        {
          id: "peer",
          header: "Подключено к",
          size: 220,
          accessorFn: (r) => (r.entity ? lk.label(lk.peerOf(r.entity.id)?.id) : ""),
          cell: ({ row }) => {
            const e = row.original.entity
            const peer = e ? lk.peerOf(e.id) : undefined
            if (!peer) return <span className="text-muted-foreground">—</span>
            return (
              <span className="flex min-w-0 items-center gap-1.5">
                <EntityLink id={peer.id} label={lk.label(peer.id)} />
                <span className="text-muted-foreground font-mono text-[11px]">{peer.via === "cable" ? "кабель" : peer.kind}</span>
              </span>
            )
          },
        },
        {
          id: "status",
          header: "Статус",
          accessorFn: (r) => (!r.entity ? "" : r.entity.kind === "interface" && r.entity.attrs.enabled === false ? "выключен" : lk.peerOf(r.entity.id) ? "занят" : "свободен"),
          cell: ({ getValue }) => {
            const v = getValue() as string
            return <StatusPill tone={v === "занят" ? "busy" : v === "свободен" ? "free" : "off"}>{v}</StatusPill>
          },
        },
        text("description", "Описание", (e) => e.description, {}),
      ]

    case "cables":
      return [
        {
          id: "a",
          header: "Сторона A",
          size: 220,
          accessorFn: (r) => lk.label(r.link?.a),
          cell: ({ row }) => <EntityLink id={row.original.link?.a} label={lk.label(row.original.link?.a)} />,
        },
        {
          id: "b",
          header: "Сторона B",
          size: 220,
          accessorFn: (r) => lk.label(r.link?.b),
          cell: ({ row }) => <EntityLink id={row.original.link?.b} label={lk.label(row.original.link?.b)} />,
        },
        {
          id: "kind",
          header: "Тип",
          accessorFn: (r) => r.link?.kind ?? "",
          cell: ({ row }) => <span className="font-mono text-xs">{row.original.link?.kind}</span>,
        },
        { id: "speed", header: "Скорость", accessorFn: (r) => r.link?.speed ?? "", cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string) || "—"}</span> },
        {
          id: "vlan",
          header: "VLAN",
          accessorFn: (r) => lk.label(r.link?.vlanId),
          cell: ({ row }) => <VlanBadge vlan={lk.byId.get(row.original.link?.vlanId ?? "")} />,
        },
        { id: "label", header: "Подпись", accessorFn: (r) => r.link?.label ?? "", cell: ({ getValue }) => (getValue() as string) || <span className="text-muted-foreground">—</span> },
        schemesCol(ctx),
      ]

    case "vlans":
      return [
        {
          id: "vid",
          header: "VID",
          size: 80,
          accessorFn: (r) => (r.entity?.kind === "vlan" ? r.entity.attrs.vid ?? 0 : 0),
          cell: ({ row }) => {
            const e = row.original.entity
            if (e?.kind !== "vlan") return null
            return (
              <EditableText
                value={e.attrs.vid != null ? String(e.attrs.vid) : ""}
                mono
                onSave={(v) => updateEntity(e, { attrs: { vid: v ? Number(v) : undefined } })}
              />
            )
          },
        },
        nameCol(ctx),
        {
          id: "color",
          header: "Цвет",
          size: 70,
          accessorFn: (r) => (r.entity?.kind === "vlan" ? r.entity.attrs.color ?? "" : ""),
          cell: ({ row }) => {
            const e = row.original.entity
            if (e?.kind !== "vlan") return null
            return (
              <input
                type="color"
                value={e.attrs.color ?? "#8b96a5"}
                onClick={(ev) => ev.stopPropagation()}
                onChange={(ev) => updateEntity(e, { attrs: { color: ev.target.value } })}
                className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                title="Цвет сети на схемах"
              />
            )
          },
        },
        {
          id: "prefixes",
          header: "Подсети",
          accessorFn: (r) => (r.entity ? lk.prefixesOfVlan(r.entity.id).map((p) => p.attrs.cidr).join(", ") : ""),
          cell: ({ row }) => {
            const list = row.original.entity ? lk.prefixesOfVlan(row.original.entity.id) : []
            return list.length ? (
              <div className="flex flex-wrap gap-x-2">
                {list.map((p) => (
                  <EntityLink key={p.id} id={p.id} label={p.attrs.cidr ?? p.name}>
                    <span className="font-mono text-[13px]">{p.attrs.cidr}</span>
                  </EntityLink>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          },
        },
        text("description", "Описание", (e) => e.description),
        schemesCol(ctx),
      ]

    case "prefixes":
      return [
        {
          id: "cidr",
          header: "CIDR",
          size: 170,
          accessorFn: (r) => (r.entity?.kind === "prefix" ? r.entity.attrs.cidr ?? "" : ""),
          cell: ({ row }) => {
            const e = row.original.entity
            if (e?.kind !== "prefix") return null
            return <EditableText value={e.attrs.cidr} mono onSave={(v) => updateEntity(e, { name: v, attrs: { cidr: v } })} />
          },
        },
        vlanCol(ctx, (e) => (e.kind === "prefix" ? e.attrs.vlanId : undefined)),
        text("gateway", "Шлюз", (e) => (e.kind === "prefix" ? e.attrs.gateway : undefined), { attr: "gateway", mono: true }),
        {
          id: "used",
          header: "Адресов",
          accessorFn: (r) => (r.entity ? lk.ipsInPrefix(r.entity.id).length : 0),
          cell: ({ getValue }) => <span className="tabular-nums">{getValue() as number}</span>,
        },
        schemesCol(ctx),
      ]

    case "ip":
      return [
        {
          id: "address",
          header: "Адрес",
          size: 160,
          accessorFn: (r) => (r.entity?.kind === "ipAddress" ? r.entity.attrs.address ?? "" : ""),
          cell: ({ row }) => {
            const e = row.original.entity
            if (e?.kind !== "ipAddress") return null
            return <EditableText value={e.attrs.address} mono onSave={(v) => updateEntity(e, { name: v, attrs: { address: v } })} />
          },
        },
        text("dns", "DNS-имя", (e) => (e.kind === "ipAddress" ? e.attrs.dnsName : undefined), { attr: "dnsName", mono: true }),
        {
          id: "owner",
          header: "Назначен",
          size: 200,
          accessorFn: (r) => (r.entity?.kind === "ipAddress" ? lk.label(r.entity.attrs.assignedToId ?? r.entity.attrs.interfaceId) : ""),
          cell: ({ row }) => {
            const e = row.original.entity
            if (e?.kind !== "ipAddress") return null
            const owner = e.attrs.assignedToId ?? e.attrs.interfaceId
            return <EntityLink id={owner} label={lk.label(owner)} />
          },
        },
        vlanCol(ctx, (e) => (e.kind === "ipAddress" ? e.attrs.vlanId : undefined)),
        text("role", "Роль", (e) => (e.kind === "ipAddress" ? e.attrs.role : undefined)),
        schemesCol(ctx),
      ]

    case "services":
      return [
        nameCol(ctx),
        text("ref", "CT / VM", (e) => (e.kind === "service" ? e.attrs.ref : undefined), { attr: "ref", mono: true, size: 100 }),
        text("url", "Адрес", (e) => (e.kind === "service" ? e.attrs.url : undefined), { attr: "url", mono: true }),
        ipCol(ctx),
        vlanCol(ctx, (e) => (e.kind === "service" ? e.attrs.vlanId : undefined)),
        {
          id: "stack",
          header: "Внутри",
          accessorFn: (r) => (r.entity ? lk.runningOn(r.entity.id).length : 0),
          cell: ({ row }) => {
            const list = row.original.entity ? lk.runningOn(row.original.entity.id) : []
            return list.length ? (
              <div className="flex flex-wrap gap-x-2 text-xs">
                {list.map((s) => (
                  <EntityLink key={s.id} id={s.id} label={s.name} />
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          },
        },
        {
          id: "parent",
          header: "Где",
          accessorFn: (r) => (r.entity ? lk.parentOf(r.entity.id)?.name ?? "" : ""),
          cell: ({ row }) => {
            const p = row.original.entity ? lk.parentOf(row.original.entity.id) : undefined
            return p ? <EntityLink id={p.id} label={p.name} /> : <span className="text-muted-foreground">—</span>
          },
        },
        schemesCol(ctx),
      ]

    case "software":
      return [
        nameCol(ctx),
        text("version", "Версия", (e) => (e.kind === "software" ? e.attrs.version : undefined), { attr: "version", mono: true }),
        text("url", "Адрес", (e) => (e.kind === "software" ? e.attrs.url : undefined), { attr: "url", mono: true }),
        {
          id: "host",
          header: "Работает на",
          accessorFn: (r) => (r.entity ? lk.hostOf(r.entity.id)?.name ?? "" : ""),
          cell: ({ row }) => {
            const h = row.original.entity ? lk.hostOf(row.original.entity.id) : undefined
            return h ? <EntityLink id={h.id} label={h.name} /> : <span className="text-muted-foreground">—</span>
          },
        },
        schemesCol(ctx),
      ]

    case "external":
      return [
        nameCol(ctx),
        text("note", "Назначение", (e) => (e.kind === "external" ? e.attrs.note : undefined), { attr: "note" }),
        text("url", "Адрес", (e) => (e.kind === "external" ? e.attrs.url : undefined), { attr: "url", mono: true }),
        {
          id: "bw",
          header: "Канал",
          accessorFn: (r) => (r.entity?.kind === "external" && r.entity.attrs.bandwidth ? `${r.entity.attrs.bandwidth.down ?? ""}` : ""),
          cell: ({ row }) => {
            const e = row.original.entity
            const bw = e?.kind === "external" ? e.attrs.bandwidth : undefined
            return bw ? <span className="font-mono text-xs">↓{bw.down ?? "?"} ↑{bw.up ?? "?"}</span> : <span className="text-muted-foreground">—</span>
          },
        },
        {
          id: "links",
          header: "Связи",
          accessorFn: (r) => (r.entity ? lk.relationsOf(r.entity.id).length : 0),
          cell: ({ row }) => {
            const rels = row.original.entity ? lk.relationsOf(row.original.entity.id) : []
            return rels.length ? (
              <div className="flex flex-wrap gap-x-2 text-xs">
                {rels.map(({ rel, via }) => {
                  const other = rel.fromId === via ? rel.toId : rel.fromId
                  return <EntityLink key={rel.id} id={other} label={`${RELATION_LABELS[rel.type]} ${lk.label(other)}`} />
                })}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          },
        },
        schemesCol(ctx),
      ]

    case "groups":
      return [
        nameCol(ctx),
        text("role", "Роль", (e) => (e.kind === "group" ? e.attrs.role : undefined), { attr: "role" }),
        text("subtitle", "Описание", (e) => (e.kind === "group" ? e.attrs.subtitle : undefined), { attr: "subtitle" }),
        ipCol(ctx),
        {
          id: "children",
          header: "Содержит",
          accessorFn: (r) => (r.entity ? lk.childrenOf(r.entity.id).length : 0),
          cell: ({ row }) => {
            const list = row.original.entity ? lk.childrenOf(row.original.entity.id) : []
            return list.length ? (
              <div className="flex flex-wrap gap-x-2 text-xs">
                {list.map((c) => (
                  <EntityLink key={c.id} id={c.id} label={c.name} />
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          },
        },
        schemesCol(ctx),
      ]

    default:
      return [nameCol(ctx), schemesCol(ctx)]
  }
}
