"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import SchemeCanvas from "@/components/canvas/SchemeCanvas"
import { Button } from "@/components/ui/button"
import { useProjectsStore } from "@/store/projectsStore"

/** /schemes/[id] — холст на всю область содержимого */
export function SchemePage({ id }: { id: string }) {
  const exists = useProjectsStore((s) => s.projects.some((p) => p.id === id))
  const setCurrentProject = useProjectsStore((s) => s.setCurrentProject)
  // Хранилище схем читается из localStorage — ждём гидратации, чтобы не мигнуть «не найдено»
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  useEffect(() => {
    if (exists) setCurrentProject(id)
  }, [id, exists, setCurrentProject])

  if (!hydrated) return <div className="flex-1" />

  if (!exists) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-muted-foreground text-sm">Схема не найдена: возможно, её удалили.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/schemes">Все схемы</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="absolute inset-0">
        <SchemeCanvas projectId={id} />
      </div>
    </div>
  )
}
