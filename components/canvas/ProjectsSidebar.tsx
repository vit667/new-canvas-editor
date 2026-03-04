import { Plus, FileText, Trash2, MoreVertical, Edit2, Copy } from "lucide-react"
import { useState } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useProjectsStore } from "@/store/projectsStore"
import { useWebSocketSync } from "@/hooks/useWebSocketSync"

export function ProjectsSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { projects, currentProjectId, createProject, setCurrentProject, deleteProject, renameProject } = useProjectsStore()
  const { createProject: syncCreateProject, deleteProject: syncDeleteProject, renameProject: syncRenameProject, syncProject } = useWebSocketSync(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)

  const handleCreateProject = () => {
    setProjectName(`Проект ${projects.length + 1}`)
    setShowCreateDialog(true)
  }

  const handleConfirmCreate = () => {
    if (projectName.trim()) {
      const projectId = createProject(projectName.trim())
      syncCreateProject(projectId, projectName.trim())
      setShowCreateDialog(false)
      setProjectName("")
    }
  }

  const handleRenameProject = (id: string, currentName: string) => {
    setEditingProjectId(id)
    setProjectName(currentName)
    setShowRenameDialog(true)
  }

  const handleConfirmRename = () => {
    if (editingProjectId && projectName.trim()) {
      renameProject(editingProjectId, projectName.trim())
      syncRenameProject(editingProjectId, projectName.trim())
      setShowRenameDialog(false)
      setProjectName("")
      setEditingProjectId(null)
    }
  }

  const handleDuplicateProject = (id: string) => {
    const project = projects.find(p => p.id === id)
    if (project) {
      const newId = createProject(`${project.name} (копия)`)
      syncCreateProject(newId, `${project.name} (копия)`)
      // Копируем nodes и edges
      const newProject = projects.find(p => p.id === newId)
      if (newProject) {
        // Обновляем проект с копированными данными
        const { updateCurrentProject } = useProjectsStore.getState()
        const prevId = currentProjectId
        setCurrentProject(newId)
        updateCurrentProject(project.nodes, project.edges)
        // Синхронизируем скопированные данные
        setTimeout(() => {
          syncProject(newId, project.nodes, project.edges, project.viewMode)
        }, 100)
        if (prevId) setCurrentProject(prevId)
      }
    }
  }

  const handleDeleteProject = (id: string, name: string) => {
    if (confirm(`Удалить проект "${name}"?`)) {
      deleteProject(id)
      syncDeleteProject(id)
    }
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="px-4 py-2">
          <h2 className="text-lg font-semibold">Canvas Editor</h2>
          <p className="text-sm text-muted-foreground">Ваши проекты</p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center justify-between w-full">
              <span>Проекты</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCreateProject}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Нет проектов.
                  <br />
                  Создайте первый проект!
                </div>
              ) : (
                projects.map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <div className="flex items-center w-full gap-1">
                      <SidebarMenuButton
                        isActive={project.id === currentProjectId}
                        onClick={() => setCurrentProject(project.id)}
                        className="flex-1"
                      >
                        <FileText className="h-4 w-4" />
                        <span>{project.name}</span>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRenameProject(project.id, project.name)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Переименовать
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateProject(project.id)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Дублировать
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteProject(project.id, project.name)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-4 py-2 text-xs text-muted-foreground text-center">
          Canvas Editor v1.0
        </div>
      </SidebarFooter>

      <SidebarRail />

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать новый проект</DialogTitle>
            <DialogDescription>
              Введите название для нового проекта canvas
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Название проекта"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmCreate()
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleConfirmCreate} disabled={!projectName.trim()}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переименовать проект</DialogTitle>
            <DialogDescription>
              Введите новое название для проекта
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Название проекта"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmRename()
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleConfirmRename} disabled={!projectName.trim()}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  )
}
