"use client";

import React, { useEffect, useState } from "react";
import { CommandIcon, SearchIcon, Network } from "lucide-react";
import { Input } from "@/components/ui/input";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProjectsStore } from "@/store/projectsStore";
import { useCanvasToolbarStore } from "@/store/canvasToolbarStore";

export default function Search() {
  const [open, setOpen] = useState(false);
  const { projects, currentProjectId, setCurrentProject, setViewMode } = useProjectsStore();
  const { actions } = useCanvasToolbarStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelectNode = (projectId: string, nodeId: string) => {
    setOpen(false);
    if (projectId !== currentProjectId) {
      setCurrentProject(projectId);
    }
    setViewMode("canvas");
    // Небольшая задержка чтобы canvas успел примонтироваться при смене проекта
    setTimeout(() => {
      actions?.focusNode(nodeId);
    }, projectId !== currentProjectId ? 300 : 50);
  };

  return (
    <div className="lg:flex-1">
      <div className="relative hidden max-w-sm flex-1 lg:block">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          className="h-9 w-full cursor-pointer rounded-md border pr-4 pl-10 text-sm shadow-xs"
          placeholder="Поиск по узлам..."
          type="search"
          onFocus={() => setOpen(true)}
        />
        <div className="absolute top-1/2 right-2 hidden -translate-y-1/2 items-center gap-0.5 rounded-sm bg-zinc-200 p-1 font-mono text-xs font-medium sm:flex dark:bg-neutral-700">
          <CommandIcon className="size-3" />
          <span>k</span>
        </div>
      </div>
      <div className="block lg:hidden">
        <Button size="icon" variant="ghost" onClick={() => setOpen(true)}>
          <SearchIcon />
        </Button>
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle></DialogTitle>
          </DialogHeader>
        </VisuallyHidden>
        <CommandInput placeholder="Поиск по узлам проекта..." />
        <CommandList>
          <CommandEmpty>Узлы не найдены.</CommandEmpty>
          {projects.map((project) => {
            const nodes = project.nodes.filter(
              (n) => n.data?.label && typeof n.data.label === "string"
            );
            if (nodes.length === 0) return null;
            return (
              <React.Fragment key={project.id}>
                <CommandGroup heading={project.name}>
                  {nodes.map((node) => (
                    <CommandItem
                      key={node.id}
                      value={`${project.name} ${node.data.label}`}
                      onSelect={() => handleSelectNode(project.id, node.id)}
                    >
                      <Network className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{node.data.label as string}</span>
                      {node.data?.host && (
                        <span className="ml-2 text-xs text-muted-foreground font-mono">
                          {node.data.host as string}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </React.Fragment>
            );
          })}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
