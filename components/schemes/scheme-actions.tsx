"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useProjectsStore } from "@/store/projectsStore"
import { useWebSocketSync } from "@/hooks/useWebSocketSync"
import { schemeHref } from "@/lib/navigation"

/**
 * Операции со схемами: создать, переименовать, дублировать, удалить.
 * Общие для сайдбара и страницы «Схемы»; синхронизируются по WS, как раньше в старом сайдбаре.
 */
export function useSchemeActions() {
  const router = useRouter()
  const { projects, createProject, renameProject, deleteProject, updateProjectGraph, setCanvasStyle, setCurrentProject } =
    useProjectsStore()
  const ws = useWebSocketSync(false)

  const [dialog, setDialog] = useState<
    | { mode: "create" }
    | { mode: "rename"; id: string; name: string }
    | { mode: "delete"; id: string; name: string }
    | null
  >(null)
  const [name, setName] = useState("")

  const create = (n: string) => {
    const id = createProject(n)
    // Новые схемы — сразу в тёмном стиле blueprint
    setCurrentProject(id)
    setCanvasStyle("blueprint")
    ws.createProject(id, n)
    router.push(schemeHref(id))
  }

  const duplicate = (id: string) => {
    const p = projects.find((x) => x.id === id)
    if (!p) return
    const newId = createProject(`${p.name} (копия)`, p.icon)
    // Копия схемы рисует те же объекты реестра — привязки сохраняем
    const nodes = structuredClone(p.nodes)
    const edges = structuredClone(p.edges)
    updateProjectGraph(newId, nodes, edges)
    setCurrentProject(newId)
    setCanvasStyle(p.canvasStyle ?? "default")
    ws.createProject(newId, `${p.name} (копия)`)
    setTimeout(() => ws.syncProject(newId, nodes, edges, "canvas"), 100)
  }

  const openCreate = () => {
    setName("")
    setDialog({ mode: "create" })
  }
  const openRename = (id: string) => {
    const p = projects.find((x) => x.id === id)
    if (!p) return
    setName(p.name)
    setDialog({ mode: "rename", id, name: p.name })
  }
  const openDelete = (id: string) => {
    const p = projects.find((x) => x.id === id)
    if (p) setDialog({ mode: "delete", id, name: p.name })
  }

  const submit = () => {
    const n = name.trim()
    if (!dialog || !n) return
    if (dialog.mode === "create") create(n)
    if (dialog.mode === "rename") {
      renameProject(dialog.id, n)
      ws.renameProject(dialog.id, n)
    }
    setDialog(null)
  }

  const dialogs = (
    <>
      <Dialog open={dialog?.mode === "create" || dialog?.mode === "rename"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "rename" ? "Переименовать схему" : "Новая схема"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5 py-2">
            <Label htmlFor="scheme-name">Название</Label>
            <Input
              id="scheme-name"
              autoFocus
              value={name}
              placeholder="Homelab, Офис на Ленина, ЦОД-2…"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Отмена
            </Button>
            <Button onClick={submit} disabled={!name.trim()}>
              {dialog?.mode === "rename" ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={dialog?.mode === "delete"} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить схему «{dialog?.mode === "delete" ? dialog.name : ""}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Схема удалится без возможности восстановления. Объекты реестра, нарисованные на ней, останутся в реестре.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (dialog?.mode !== "delete") return
                deleteProject(dialog.id)
                ws.deleteProject(dialog.id)
                setDialog(null)
                if (window.location.pathname === schemeHref(dialog.id)) router.push("/schemes")
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  return { openCreate, openRename, openDelete, duplicate, dialogs }
}
