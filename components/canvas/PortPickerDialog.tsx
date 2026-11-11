"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useNetworksStore } from "@/lib/blueprint"
import type { PortStatus } from "@/lib/inventory/port-occupancy"
import type { SwitchPort } from "./nodes/blueprint/SwitchNode"

const STATE: Record<PortStatus["state"], { label: string; cls: string }> = {
  free: { label: "свободен", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  remote: { label: "занят на другой схеме", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  busy: { label: "занят", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  off: { label: "выключен", cls: "bg-muted text-muted-foreground" },
}

/**
 * Выбор порта коммутатора, когда связь бросили на карточку мимо портов.
 * Занятые на этой схеме порты недоступны; занятые на другой схеме — можно, с предупреждением.
 */
export function PortPickerDialog({
  open,
  deviceName,
  ports,
  statuses,
  onPick,
  onWithoutPort,
  onCancel,
}: {
  open: boolean
  deviceName: string
  ports: SwitchPort[]
  statuses: Map<string, PortStatus>
  onPick: (portId: string) => void
  onWithoutPort: () => void
  onCancel: () => void
}) {
  const networks = useNetworksStore((s) => s.networks)
  const free = ports.filter((p) => (statuses.get(p.id)?.state ?? "free") === "free").length

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Порт на {deviceName}</DialogTitle>
          <DialogDescription>
            Свободно {free} из {ports.length}. Связь встанет в выбранный порт и возьмёт его VLAN, режим и скорость.
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y rounded-lg border">
          {ports.map((p) => {
            const st = statuses.get(p.id) ?? { state: "free" as const }
            const net = networks.find((n) => n.id === p.vlanId)
            const disabled = st.state === "busy"
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => onPick(p.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left text-sm",
                  disabled ? "cursor-not-allowed opacity-50" : "hover:bg-muted/50"
                )}
              >
                <span className="w-14 shrink-0 font-mono font-medium">{p.name}</span>
                <span className="text-muted-foreground w-12 shrink-0 font-mono text-xs">{p.kind === "sfp" ? "SFP" : "RJ45"}</span>
                <span className="w-12 shrink-0 font-mono text-xs">{p.speed ?? "—"}</span>
                <span className="flex w-28 shrink-0 items-center gap-1.5 text-xs">
                  {p.trunk ? (
                    <span className="text-muted-foreground">trunk</span>
                  ) : net ? (
                    <>
                      <span className="size-2 rounded-full" style={{ background: net.color }} />
                      {net.tag}
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
                <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                  {st.peer ? `→ ${st.peer}` : p.label}
                </span>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", STATE[st.state].cls)}>{STATE[st.state].label}</span>
              </button>
            )
          })}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={onWithoutPort}>
            Без порта
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Отмена
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
