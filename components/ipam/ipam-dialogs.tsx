"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, CircleX, CornerDownRight, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getInventory } from "@/lib/inventory/local-adapter"
import { newEntityId } from "@/lib/inventory/repository"
import {
  DEFAULT_VRF,
  checkNewPrefix,
  cidrHasIp,
  ipToInt,
  parseCidr,
  parseRange,
  vrfOf,
  type PrefixTree,
} from "@/lib/inventory/ipam"
import type { Entity, EntityInput } from "@/lib/inventory/types"

const selectClass =
  "border-input bg-background h-9 w-full rounded-md border px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"

function Messages({ errors, warnings, info }: { errors: string[]; warnings: string[]; info?: React.ReactNode }) {
  if (!errors.length && !warnings.length && !info) return null
  return (
    <div className="space-y-1 rounded-md border p-2.5 text-xs">
      {errors.map((m) => (
        <div key={m} className="text-destructive flex items-start gap-1.5">
          <CircleX className="mt-px size-3.5 shrink-0" /> {m}
        </div>
      ))}
      {warnings.map((m) => (
        <div key={m} className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-px size-3.5 shrink-0" /> {m}
        </div>
      ))}
      {info}
    </div>
  )
}

export function VrfSelect({ value, onChange, vrfs }: { value: string; onChange: (v: string) => void; vrfs: Entity<"vrf">[] }) {
  return (
    <div className="flex gap-1.5">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        <option value={DEFAULT_VRF}>Глобальная таблица (default)</option>
        {vrfs.map((v) => (
          <option key={v.id} value={v.id}>
            VRF {v.name}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        title="Новый VRF"
        onClick={() => {
          const name = window.prompt("Имя нового VRF (например, MGMT, CUSTOMER-A)")?.trim()
          if (!name) return
          const id = newEntityId()
          const res = getInventory().apply([{ op: "upsert", entity: { id, kind: "vrf", name, attrs: {}, source: { type: "manual" } } as EntityInput }], "registry")
          if (res.ok) onChange(id)
        }}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  )
}

/** Создание и правка подсети с проверкой на лету */
export function PrefixDialog({
  open,
  onOpenChange,
  tree,
  vrfs,
  vlans,
  initial,
  defaults,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  tree: PrefixTree
  vrfs: Entity<"vrf">[]
  vlans: Entity<"vlan">[]
  initial?: Entity<"prefix">
  defaults?: { cidr?: string; vrfId?: string }
  onSaved?: (id: string) => void
}) {
  const [cidr, setCidr] = useState("")
  const [name, setName] = useState("")
  const [vrfId, setVrfId] = useState(DEFAULT_VRF)
  const [vlanId, setVlanId] = useState("")
  const [gateway, setGateway] = useState("")
  const [dhcp, setDhcp] = useState<{ start: string; end: string }[]>([])
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (!open) return
    setCidr(initial?.attrs.cidr ?? defaults?.cidr ?? "")
    setName(initial && initial.name !== initial.attrs.cidr ? initial.name : "")
    setVrfId(initial ? vrfOf(initial) : defaults?.vrfId ?? DEFAULT_VRF)
    setVlanId(initial?.attrs.vlanId ?? "")
    setGateway(initial?.attrs.gateway ?? "")
    setDhcp(initial?.attrs.dhcpRanges ?? [])
    setDescription(initial?.description ?? "")
  }, [open, initial, defaults?.cidr, defaults?.vrfId])

  const check = useMemo(
    () => checkNewPrefix(tree, { cidr, vrfId, gateway, dhcpRanges: dhcp.filter((r) => r.start || r.end), selfId: initial?.id }),
    [tree, cidr, vrfId, gateway, dhcp, initial?.id]
  )
  // Подсеть со схемы: CIDR и VLAN задаёт панель «Сети», остальное — здесь
  const fromDiagram = initial?.source?.type === "diagram"

  const suggestGateway = () => {
    const c = parseCidr(cidr)
    if (c && c.len < 31) setGateway(`${c.network >>> 24}.${(c.network >>> 16) & 255}.${(c.network >>> 8) & 255}.${(c.network & 255) + 1}`)
  }

  const save = () => {
    if (check.errors.length || !check.normalized) return
    const id = initial?.id ?? newEntityId()
    const entity = {
      ...(initial ?? { source: { type: "manual" as const } }),
      id,
      kind: "prefix",
      name: name.trim() || check.normalized,
      description: description.trim() || undefined,
      attrs: {
        ...(initial?.attrs ?? {}),
        cidr: check.normalized,
        vrfId: vrfId === DEFAULT_VRF ? undefined : vrfId,
        vlanId: vlanId || undefined,
        gateway: gateway.trim() || undefined,
        dhcpRanges: dhcp.filter((r) => r.start && r.end).length ? dhcp.filter((r) => r.start && r.end) : undefined,
      },
    } as EntityInput
    const res = getInventory().apply([{ op: "upsert", entity }], "registry")
    if (!res.ok) {
      toast.error(res.issues[0]?.message ?? "Не удалось сохранить")
      return
    }
    toast.success(initial ? `Подсеть ${check.normalized} сохранена` : `Подсеть ${check.normalized} добавлена`)
    onOpenChange(false)
    onSaved?.(id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Подсеть" : "Новая подсеть"}</DialogTitle>
          <DialogDescription>Проверка на дубли в VRF, вложенность, шлюз и DHCP-пулы — на лету.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pfx-cidr">CIDR</Label>
              <Input
                id="pfx-cidr"
                autoFocus={!initial}
                value={cidr}
                disabled={fromDiagram}
                placeholder="10.0.30.0/24"
                className="font-mono"
                onChange={(e) => setCidr(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pfx-name">Имя</Label>
              <Input id="pfx-name" value={name} placeholder={check.normalized ?? "GUEST"} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <div className="grid gap-1.5">
              <Label>VRF</Label>
              <VrfSelect value={vrfId} onChange={setVrfId} vrfs={vrfs} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pfx-vlan">VLAN</Label>
              <select id="pfx-vlan" value={vlanId} disabled={fromDiagram} onChange={(e) => setVlanId(e.target.value)} className={selectClass}>
                <option value="">— без VLAN —</option>
                {vlans.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.attrs.vid != null ? `${v.attrs.vid} · ` : ""}
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="pfx-gw">Шлюз</Label>
              <button type="button" onClick={suggestGateway} className="text-muted-foreground text-xs underline-offset-2 hover:underline">
                первый адрес
              </button>
            </div>
            <Input id="pfx-gw" value={gateway} placeholder="10.0.30.1" className="font-mono" onChange={(e) => setGateway(e.target.value)} />
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label>DHCP-пулы</Label>
              <Button type="button" size="sm" variant="ghost" onClick={() => setDhcp([...dhcp, { start: "", end: "" }])}>
                <Plus className="size-3.5" /> Пул
              </Button>
            </div>
            {dhcp.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Input value={r.start} placeholder="10.0.30.100" className="font-mono" onChange={(e) => setDhcp(dhcp.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
                <span className="text-muted-foreground">–</span>
                <Input value={r.end} placeholder="10.0.30.199" className="font-mono" onChange={(e) => setDhcp(dhcp.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
                <Button type="button" size="icon" variant="ghost" onClick={() => setDhcp(dhcp.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="pfx-desc">Описание</Label>
            <Textarea id="pfx-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {cidr.trim() && (
            <Messages
              errors={check.errors}
              warnings={check.warnings}
              info={
                check.normalized && !check.errors.length ? (
                  <div className="text-muted-foreground space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <CornerDownRight className="size-3.5" />
                      {check.parent ? (
                        <>
                          войдёт в <span className="text-foreground font-mono">{check.parent.entity.attrs.cidr}</span>
                        </>
                      ) : (
                        "корневая подсеть"
                      )}
                    </div>
                    {check.swallows.length > 0 && (
                      <div className="pl-5">
                        внутри окажутся: <span className="text-foreground font-mono">{check.swallows.map((n) => n.entity.attrs.cidr).join(", ")}</span>
                      </div>
                    )}
                  </div>
                ) : undefined
              }
            />
          )}
          {fromDiagram && <p className="text-muted-foreground text-xs">CIDR и VLAN этой подсети задаются на схеме, в панели «Сети».</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={save} disabled={!check.normalized || check.errors.length > 0}>
            {initial ? "Сохранить" : "Добавить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Новый IP-адрес: подставляется следующий свободный, проверяется на занятость */
export function IpDialog({
  open,
  onOpenChange,
  tree,
  owners,
  defaults,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  tree: PrefixTree
  owners: Entity[]
  defaults?: { address?: string; vrfId?: string }
}) {
  const [address, setAddress] = useState("")
  const [dnsName, setDnsName] = useState("")
  const [ownerId, setOwnerId] = useState("")
  const [description, setDescription] = useState("")
  const vrfId = defaults?.vrfId ?? DEFAULT_VRF

  useEffect(() => {
    if (!open) return
    setAddress(defaults?.address ?? "")
    setDnsName("")
    setOwnerId("")
    setDescription("")
  }, [open, defaults?.address])

  const check = useMemo(() => {
    const errors: string[] = []
    const warnings: string[] = []
    const n = ipToInt(address)
    if (address.trim() && n === null) errors.push("Некорректный IPv4-адрес")
    let prefixCidr: string | undefined
    if (n !== null) {
      const dup = getInventory()
        .list("ipAddress")
        .find((ip) => ip.kind === "ipAddress" && ip.attrs.address === address.trim() && vrfOf(ip) === vrfId)
      if (dup) errors.push(`Адрес уже занят: «${dup.name}»`)
      const home = [...tree.byId.values()]
        .filter((p) => p.vrfId === vrfId && cidrHasIp(p.cidr, n))
        .sort((a, b) => b.cidr.len - a.cidr.len)[0]
      if (!home) warnings.push("Адрес не входит ни в одну подсеть этого VRF")
      else {
        prefixCidr = home.entity.attrs.cidr
        if (home.cidr.len < 31 && (n === home.cidr.first || n === home.cidr.last)) errors.push("Это адрес сети или broadcast")
        if (home.entity.attrs.gateway === address.trim()) warnings.push("Это шлюз подсети")
        for (const r of home.entity.attrs.dhcpRanges || []) {
          const pr = parseRange(r)
          if (pr && n >= pr.start && n <= pr.end) warnings.push(`Внутри DHCP-пула ${r.start}–${r.end}`)
        }
      }
    }
    return { errors, warnings, prefixCidr, ok: n !== null && !errors.length }
  }, [address, tree, vrfId])

  const save = () => {
    if (!check.ok) return
    const owner = ownerId ? getInventory().get(ownerId) : undefined
    const vlanId = owner && "vlanId" in owner.attrs ? (owner.attrs as { vlanId?: string }).vlanId : undefined
    const entity = {
      id: newEntityId(),
      kind: "ipAddress",
      name: address.trim(),
      description: description.trim() || undefined,
      source: { type: "manual" },
      attrs: {
        address: address.trim(),
        vrfId: vrfId === DEFAULT_VRF ? undefined : vrfId,
        dnsName: dnsName.trim() || undefined,
        assignedToId: ownerId || undefined,
        vlanId,
      },
    } as EntityInput
    const res = getInventory().apply([{ op: "upsert", entity }], "registry")
    if (!res.ok) return toast.error(res.issues[0]?.message ?? "Не удалось сохранить")
    toast.success(`Адрес ${address.trim()} занят`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Занять адрес</DialogTitle>
          <DialogDescription>Адрес попадёт в реестр и в карту подсети.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ip-addr">Адрес</Label>
              <Input id="ip-addr" autoFocus value={address} className="font-mono" onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ip-dns">DNS-имя</Label>
              <Input id="ip-dns" value={dnsName} placeholder="host.internal" className="font-mono" onChange={(e) => setDnsName(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ip-owner">Кому назначен</Label>
            <select id="ip-owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={selectClass}>
              <option value="">— пока никому (резерв) —</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ip-desc">Описание</Label>
            <Input id="ip-desc" value={description} placeholder="резерв под новый принтер" onChange={(e) => setDescription(e.target.value)} />
          </div>
          {address.trim() && (
            <Messages
              errors={check.errors}
              warnings={check.warnings}
              info={check.prefixCidr && !check.errors.length ? <div className="text-muted-foreground">подсеть <span className="text-foreground font-mono">{check.prefixCidr}</span></div> : undefined}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={save} disabled={!check.ok}>
            Занять
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
