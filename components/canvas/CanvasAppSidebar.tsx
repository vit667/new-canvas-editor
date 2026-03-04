"use client"

import * as React from "react"
import { useState } from "react"
import {
  Plus, Trash2, MoreVertical, Edit2, Copy, ChevronsUpDown,
  FileText, Network, Server, Database, Layers, Globe, Shield,
  Workflow, GitBranch, Cloud, HardDrive, Monitor, Cpu, Router,
  Lock, Folder, Boxes, LayoutDashboard, Cable, Radio,
  type LucideIcon,
} from "lucide-react"
import Logo from "@/components/layout/logo"
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
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
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
import { NavUser } from "@/components/layout/sidebar/nav-user"
import { useProjectsStore } from "@/store/projectsStore"
import { useWebSocketSync } from "@/hooks/useWebSocketSync"

const PROJECT_ICONS: { name: string; icon: LucideIcon }[] = [
  { name: "FileText",       icon: FileText },
  { name: "Folder",         icon: Folder },
  { name: "Network",        icon: Network },
  { name: "Server",         icon: Server },
  { name: "Database",       icon: Database },
  { name: "Layers",         icon: Layers },
  { name: "Globe",          icon: Globe },
  { name: "Shield",         icon: Shield },
  { name: "Workflow",       icon: Workflow },
  { name: "GitBranch",      icon: GitBranch },
  { name: "Cloud",          icon: Cloud },
  { name: "HardDrive",      icon: HardDrive },
  { name: "Monitor",        icon: Monitor },
  { name: "Cpu",            icon: Cpu },
  { name: "Router",         icon: Router },
  { name: "Lock",           icon: Lock },
  { name: "Boxes",          icon: Boxes },
  { name: "LayoutDashboard",icon: LayoutDashboard },
  { name: "Cable",          icon: Cable },
  { name: "Radio",          icon: Radio },
]

function ProjectIcon({ name, className }: { name?: string; className?: string }) {
  const found = PROJECT_ICONS.find(i => i.name === name)
  const Icon = found?.icon ?? FileText
  return <Icon className={className} />
}

export function CanvasAppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { projects, currentProjectId, createProject, setCurrentProject, deleteProject, renameProject } = useProjectsStore()
  const { createProject: syncCreateProject, deleteProject: syncDeleteProject, renameProject: syncRenameProject, syncProject } = useWebSocketSync(false)
  const { isMobile } = useSidebar()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [selectedIcon, setSelectedIcon] = useState("FileText")
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)

  const handleCreateProject = () => {
    setProjectName(`Проект ${projects.length + 1}`)
    setSelectedIcon("FileText")
    setShowCreateDialog(true)
  }

  const handleConfirmCreate = () => {
    if (projectName.trim()) {
      const projectId = createProject(projectName.trim(), selectedIcon)
      syncCreateProject(projectId, projectName.trim())
      setShowCreateDialog(false)
      setProjectName("")
      setSelectedIcon("FileText")
    }
  }

  const handleRenameProject = (id: string, currentName: string, currentIcon?: string) => {
    setEditingProjectId(id)
    setProjectName(currentName)
    setSelectedIcon(currentIcon ?? "FileText")
    setShowRenameDialog(true)
  }

  const handleConfirmRename = () => {
    if (editingProjectId && projectName.trim()) {
      renameProject(editingProjectId, projectName.trim(), selectedIcon)
      syncRenameProject(editingProjectId, projectName.trim())
      setShowRenameDialog(false)
      setProjectName("")
      setSelectedIcon("FileText")
      setEditingProjectId(null)
    }
  }

  const handleDuplicateProject = (id: string) => {
    const project = projects.find(p => p.id === id)
    if (project) {
      const newId = createProject(`${project.name} (копия)`, project.icon)
      syncCreateProject(newId, `${project.name} (копия)`)
      const prevId = currentProjectId
      setCurrentProject(newId)
      const { updateCurrentProject } = useProjectsStore.getState()
      updateCurrentProject(project.nodes, project.edges)
      setTimeout(() => syncProject(newId, project.nodes, project.edges, project.viewMode), 100)
      if (prevId) setCurrentProject(prevId)
    }
  }

  const handleDeleteProject = (id: string, name: string) => {
    if (confirm(`Удалить проект "${name}"?`)) {
      deleteProject(id)
      syncDeleteProject(id)
    }
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="hover:text-foreground h-10 group-data-[collapsible=icon]:px-0! hover:bg-[var(--primary)]/5">
              <Logo />
              <span className="text-foreground font-semibold">Canvas Editor</span>
              <ChevronsUpDown className="ml-auto group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full">
          <SidebarGroup>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
              <div className="flex items-center justify-between w-full">
                <span>Проекты</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 -mr-1"
                  onClick={handleCreateProject}
                  title="Новый проект"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projects.length === 0 ? (
                  <div className="px-2 py-6 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                    Нет проектов
                  </div>
                ) : (
                  projects.map((project) => (
                    <SidebarMenuItem key={project.id}>
                      <div className="flex items-center w-full group/menu-item">
                        <SidebarMenuButton
                          isActive={project.id === currentProjectId}
                          onClick={() => setCurrentProject(project.id)}
                          className="flex-1 min-w-0 hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10"
                          title={project.name}
                        >
                          <ProjectIcon name={project.icon} className="h-4 w-4 shrink-0" />
                          <span className="truncate">{project.name}</span>
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 opacity-0 group-hover/menu-item:opacity-100 group-data-[collapsible=icon]:hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side={isMobile ? "bottom" : "right"} align="start">
                            <DropdownMenuItem onClick={() => handleRenameProject(project.id, project.name, project.icon)}>
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
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />

      {/* Диалог создания */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать новый проект</DialogTitle>
            <DialogDescription>Введите название и выберите иконку</DialogDescription>
          </DialogHeader>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Название проекта"
            onKeyDown={(e) => e.key === 'Enter' && handleConfirmCreate()}
            autoFocus
          />
          <div className="grid grid-cols-10 gap-1">
            {PROJECT_ICONS.map(({ name, icon: Icon }) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedIcon(name)}
                className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${
                  selectedIcon === name
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                title={name}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Отмена</Button>
            <Button onClick={handleConfirmCreate} disabled={!projectName.trim()}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог переименования */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переименовать проект</DialogTitle>
            <DialogDescription>Измените название и иконку проекта</DialogDescription>
          </DialogHeader>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Название проекта"
            onKeyDown={(e) => e.key === 'Enter' && handleConfirmRename()}
            autoFocus
          />
          <div className="grid grid-cols-10 gap-1">
            {PROJECT_ICONS.map(({ name, icon: Icon }) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelectedIcon(name)}
                className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${
                  selectedIcon === name
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                title={name}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>Отмена</Button>
            <Button onClick={handleConfirmRename} disabled={!projectName.trim()}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  )
}
